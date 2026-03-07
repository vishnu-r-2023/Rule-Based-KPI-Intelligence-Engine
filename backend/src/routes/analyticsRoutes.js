import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { Employee } from "../models/Employee.js";
import { DatasetMeta } from "../models/DatasetMeta.js";
import {
  makePreviewRowsFromEmployees,
  normalizeRowsToEmployees,
  parseDatasetBuffer,
  REQUIRED_DATASET_FIELDS,
} from "../utils/datasetParser.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const DEFAULT_META = {
  datasetId: null,
  fileName: "No dataset uploaded",
  uploadedAt: new Date().toISOString(),
  recordCount: 0,
  source: "empty",
  validationMessages: [],
  isActive: false,
};

const getLegacyMetaKey = (userId) => `active:${userId}`;
const getDatasetMetaKey = (userId, datasetId) => `dataset:${userId}:${datasetId}`;

const getOrphanDatasetQuery = (userId) => ({
  ownerUserId: userId,
  $or: [{ datasetId: { $exists: false } }, { datasetId: null }, { datasetId: "" }],
});

const toClientEmployee = (employee) => ({
  employeeId: employee.employeeId,
  department: employee.department,
  jobRole: employee.jobRole,
  age: employee.age,
  monthlyIncome: employee.monthlyIncome,
  performanceRating: employee.performanceRating,
  jobSatisfaction: employee.jobSatisfaction,
  attrition: employee.attrition,
  workLifeBalance: employee.workLifeBalance,
  yearsExperience: employee.yearsExperience,
  recordDate: employee.snapshotDate,
  tasksAssigned: employee.tasksAssigned,
  tasksCompleted: employee.tasksCompleted,
  loggedHours: employee.loggedHours,
  billableHours: employee.billableHours,
  absentDays: employee.absentDays,
  lateDays: employee.lateDays,
  goalAchievementPct: employee.goalAchievementPct,
  qualityScore: employee.qualityScore,
  revenueGenerated: employee.revenueGenerated,
  departmentBudget: employee.departmentBudget,
  departmentExpense: employee.departmentExpense,
});

const toClientMeta = (meta) => {
  if (!meta) {
    return {
      ...DEFAULT_META,
      uploadedAt: new Date().toISOString(),
    };
  }

  return {
    datasetId: meta.datasetId || null,
    fileName: meta.fileName || DEFAULT_META.fileName,
    uploadedAt: meta.uploadedAt || new Date().toISOString(),
    recordCount: Number(meta.recordCount || 0),
    source: meta.source || "uploaded",
    validationMessages: meta.validationMessages || [],
    isActive: Boolean(meta.isActive),
  };
};

const toDatasetSummary = (meta) => ({
  datasetId: meta.datasetId || null,
  fileName: meta.fileName || DEFAULT_META.fileName,
  uploadedAt: meta.uploadedAt || new Date().toISOString(),
  recordCount: Number(meta.recordCount || 0),
  source: meta.source || "uploaded",
  isActive: Boolean(meta.isActive),
});

const buildResponsePayload = (state) => ({
  employees: state.clientEmployees,
  datasetMeta: state.datasetMeta,
  previewRows: makePreviewRowsFromEmployees(state.clientEmployees),
  validationMessages: state.validationMessages || [],
  requiredFields: REQUIRED_DATASET_FIELDS,
  datasets: state.datasets,
  activeDatasetId: state.activeDatasetId,
});

const migrateLegacyActiveMeta = async (userId) => {
  const legacyMeta = await DatasetMeta.findOne({ key: getLegacyMetaKey(userId) });
  if (!legacyMeta) {
    return;
  }

  const datasetId = legacyMeta.datasetId || randomUUID();
  legacyMeta.key = getDatasetMetaKey(userId, datasetId);
  legacyMeta.ownerUserId = userId;
  legacyMeta.datasetId = datasetId;
  legacyMeta.isActive = true;
  legacyMeta.source = legacyMeta.source || (Number(legacyMeta.recordCount || 0) > 0 ? "uploaded" : "empty");

  await legacyMeta.save();
  await Employee.updateMany(getOrphanDatasetQuery(userId), { $set: { datasetId } });
  await DatasetMeta.updateMany(
    {
      ownerUserId: userId,
      _id: { $ne: legacyMeta._id },
    },
    { $set: { isActive: false } }
  );
};

const getActiveDatasetMeta = async (userId) => {
  await migrateLegacyActiveMeta(userId);

  const activeCandidates = await DatasetMeta.find({ ownerUserId: userId, isActive: true })
    .sort({ uploadedAt: -1, createdAt: -1 })
    .lean();

  if (activeCandidates.length > 1) {
    const [winner, ...others] = activeCandidates;
    await DatasetMeta.updateMany(
      {
        ownerUserId: userId,
        _id: { $in: others.map((meta) => meta._id) },
      },
      { $set: { isActive: false } }
    );
    return winner;
  }

  if (activeCandidates.length === 1) {
    return activeCandidates[0];
  }

  const newestMeta = await DatasetMeta.findOne({ ownerUserId: userId })
    .sort({ uploadedAt: -1, createdAt: -1 })
    .lean();

  if (newestMeta) {
    await DatasetMeta.updateOne({ _id: newestMeta._id }, { $set: { isActive: true } });
    return { ...newestMeta, isActive: true };
  }

  const orphanCount = await Employee.countDocuments(getOrphanDatasetQuery(userId));
  if (orphanCount === 0) {
    return null;
  }

  const datasetId = randomUUID();
  await Employee.updateMany(getOrphanDatasetQuery(userId), { $set: { datasetId } });

  const recoveredMeta = await DatasetMeta.create({
    key: getDatasetMetaKey(userId, datasetId),
    ownerUserId: userId,
    datasetId,
    isActive: true,
    fileName: "Recovered dataset",
    uploadedAt: new Date(),
    recordCount: orphanCount,
    source: "uploaded",
    validationMessages: ["Recovered metadata from existing employee records."],
  });

  return recoveredMeta.toObject();
};

const getDatasets = async (userId) => {
  const metas = await DatasetMeta.find({ ownerUserId: userId })
    .sort({ uploadedAt: -1, createdAt: -1 })
    .lean();

  const seen = new Set();
  const datasets = [];

  metas.forEach((meta) => {
    if (!meta.datasetId || seen.has(meta.datasetId)) {
      return;
    }
    seen.add(meta.datasetId);
    datasets.push(toDatasetSummary(meta));
  });

  return datasets;
};

const getAnalyticsState = async (userId) => {
  const activeMeta = await getActiveDatasetMeta(userId);

  let employees = [];
  if (activeMeta?.datasetId) {
    employees = await Employee.find({
      ownerUserId: userId,
      datasetId: activeMeta.datasetId,
    })
      .sort({ snapshotDate: -1 })
      .lean();

    if (!employees.length) {
      const orphanCount = await Employee.countDocuments(getOrphanDatasetQuery(userId));
      if (orphanCount > 0) {
        await Employee.updateMany(getOrphanDatasetQuery(userId), {
          $set: { datasetId: activeMeta.datasetId },
        });
        employees = await Employee.find({
          ownerUserId: userId,
          datasetId: activeMeta.datasetId,
        })
          .sort({ snapshotDate: -1 })
          .lean();
      }
    }

    if (Number(activeMeta.recordCount || 0) !== employees.length) {
      await DatasetMeta.updateOne(
        { ownerUserId: userId, datasetId: activeMeta.datasetId },
        { $set: { recordCount: employees.length } }
      );
      activeMeta.recordCount = employees.length;
    }
  }

  const clientEmployees = employees.map(toClientEmployee);
  const datasetMeta = toClientMeta(activeMeta);
  const datasets = await getDatasets(userId);

  return {
    clientEmployees,
    datasetMeta,
    validationMessages: datasetMeta.validationMessages || [],
    datasets,
    activeDatasetId: datasetMeta.datasetId || null,
  };
};

router.get("/bootstrap", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const state = await getAnalyticsState(userId);
    res.json(buildResponsePayload(state));
  } catch (error) {
    next(error);
  }
});

router.post("/dataset/upload", upload.single("file"), async (req, res, next) => {
  try {
    const userId = req.auth.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        issues: ["No file uploaded. Please select a CSV or Excel file."],
      });
    }

    const extension = String(req.file.originalname || "")
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(extension || "")) {
      return res.status(400).json({
        success: false,
        issues: ["Unsupported file type. Please upload .csv, .xlsx, or .xls."],
      });
    }

    const rows = parseDatasetBuffer(req.file.buffer, extension);
    const parsed = normalizeRowsToEmployees(rows);

    if (parsed.blocking) {
      return res.status(400).json({
        success: false,
        issues: parsed.issues,
        previewRows: parsed.previewRows,
        count: 0,
      });
    }

    const datasetId = randomUUID();

    await DatasetMeta.updateMany(
      {
        ownerUserId: userId,
        isActive: true,
      },
      { $set: { isActive: false } }
    );

    await Employee.insertMany(
      parsed.employees.map((employee) => ({
        ...employee,
        ownerUserId: userId,
        datasetId,
      })),
      { ordered: false }
    );

    await DatasetMeta.create({
      key: getDatasetMetaKey(userId, datasetId),
      ownerUserId: userId,
      datasetId,
      isActive: true,
      fileName: req.file.originalname,
      uploadedAt: new Date(),
      recordCount: parsed.employees.length,
      source: "uploaded",
      validationMessages: parsed.issues,
    });

    const state = await getAnalyticsState(userId);

    res.json({
      success: true,
      issues: parsed.issues,
      count: state.clientEmployees.length,
      ...buildResponsePayload(state),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/dataset/switch", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const datasetId = String(req.body?.datasetId || "").trim();

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: "datasetId is required.",
      });
    }

    const targetDataset = await DatasetMeta.findOne({
      ownerUserId: userId,
      datasetId,
    }).lean();

    if (!targetDataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found.",
      });
    }

    await DatasetMeta.updateMany(
      {
        ownerUserId: userId,
        isActive: true,
      },
      { $set: { isActive: false } }
    );

    await DatasetMeta.updateOne(
      {
        ownerUserId: userId,
        datasetId,
      },
      { $set: { isActive: true } }
    );

    const state = await getAnalyticsState(userId);

    res.json({
      success: true,
      ...buildResponsePayload(state),
    });
  } catch (error) {
    next(error);
  }
});

const deleteDatasetById = async (userId, datasetId) => {
  const targetDataset = await DatasetMeta.findOne({
    ownerUserId: userId,
    datasetId,
  }).lean();

  if (!targetDataset) {
    return false;
  }

  await Promise.all([
    Employee.deleteMany({
      ownerUserId: userId,
      datasetId,
    }),
    DatasetMeta.deleteMany({
      ownerUserId: userId,
      datasetId,
    }),
  ]);

  if (targetDataset.isActive) {
    const nextDataset = await DatasetMeta.findOne({ ownerUserId: userId })
      .sort({ uploadedAt: -1, createdAt: -1 })
      .lean();

    if (nextDataset?.datasetId) {
      await DatasetMeta.updateMany(
        {
          ownerUserId: userId,
          isActive: true,
        },
        { $set: { isActive: false } }
      );

      await DatasetMeta.updateOne(
        {
          ownerUserId: userId,
          datasetId: nextDataset.datasetId,
        },
        { $set: { isActive: true } }
      );
    }
  }

  return true;
};

router.delete("/dataset/:datasetId", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const datasetId = String(req.params.datasetId || "").trim();

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: "datasetId is required.",
      });
    }

    const wasDeleted = await deleteDatasetById(userId, datasetId);
    if (!wasDeleted) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found.",
      });
    }

    const state = await getAnalyticsState(userId);

    res.json({
      success: true,
      ...buildResponsePayload(state),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/dataset", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const state = await getAnalyticsState(userId);

    if (state.activeDatasetId) {
      await deleteDatasetById(userId, state.activeDatasetId);
    }

    const nextState = await getAnalyticsState(userId);

    res.json({ success: true, ...buildResponsePayload(nextState) });
  } catch (error) {
    next(error);
  }
});

export default router;

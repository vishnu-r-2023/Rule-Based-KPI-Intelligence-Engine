import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDefaultUser, fetchCurrentUser, persistUser, readStoredUser } from "../services/userService";

const UserContext = createContext({
  user: getDefaultUser(),
  isUserLoading: true,
  updateUser: () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser() || getDefaultUser());
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const fetchedUser = await fetchCurrentUser();
        if (isMounted) {
          setUser(fetchedUser);
          persistUser(fetchedUser);
        }
      } finally {
        if (isMounted) {
          setIsUserLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((currentUser) => {
      const nextUser = { ...currentUser, ...updates };
      persistUser(nextUser);
      return nextUser;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isUserLoading,
      updateUser,
    }),
    [isUserLoading, updateUser, user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}

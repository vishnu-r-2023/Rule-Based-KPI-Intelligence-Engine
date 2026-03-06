import { ThemeProvider } from "./ThemeContext";
import { UserProvider } from "./UserContext";

function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <UserProvider>{children}</UserProvider>
    </ThemeProvider>
  );
}

export default AppProviders;

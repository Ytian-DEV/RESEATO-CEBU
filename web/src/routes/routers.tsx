import { createBrowserRouter } from "react-router-dom";
import AppShell from "../app/AppShell";
import HomePage from "../pages/HomePage";
import RestaurantsPage from "../pages/RestaurantsPage";
import RestaurantDetailsPage from "../pages/RestaurantDetailsPage";
import AuthPage from "../pages/AuthPage";
import AboutPage from "../pages/AboutPage";
import TermsPage from "../pages/TermsPage";
import MyReservationsPage from "../pages/MyReservationsPage";
import ProfilePage from "../pages/ProfilePage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/restaurants", element: <RestaurantsPage /> },
      { path: "/restaurants/:id", element: <RestaurantDetailsPage /> },
      { path: "/log-in-sign-up", element: <AuthPage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/terms", element: <TermsPage /> },
      { path: "/my-reservations", element: <MyReservationsPage /> },
      { path: "/profile", element: <ProfilePage /> },
    ],
  },
]);
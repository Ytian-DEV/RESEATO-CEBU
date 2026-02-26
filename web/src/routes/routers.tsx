import { createBrowserRouter } from 'react-router-dom';
import AppShell from '../app/AppShell';
import HomePage from '../pages/HomePage';
import RestaurantsPage from '../pages/RestaurantsPage';
import RestaurantDetailsPage from '../pages/RestaurantDetailsPage';
import LoginPage from '../pages/LogInPage';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/restaurants', element: <RestaurantsPage /> },
      { path: '/restaurants/:id', element: <RestaurantDetailsPage /> },
      { path: '/login', element: <LoginPage /> }
    ],
  },
]);
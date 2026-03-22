import { Redirect } from 'expo-router';

export default function Index() {
  // Cuando ingresamos a la ruta raíz `/`, redirigimos automáticamente a los Tabs.
  // El control de si el usuario está logueado o no lo maneja RootLayoutNav en `_layout.tsx`.
  return <Redirect href="/(tabs)" />;
}

import "@/styles/globals.css";
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import type { AppProps } from "next/app";
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#000000', // This is the main background color
    ],
  },
  components: {
    Paper: {
      defaultProps: {
        bg: 'dark.8',
      },
    },
    Container: {
      defaultProps: {
        bg: 'dark.9',
      },
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications />
      <Component {...pageProps} />
    </MantineProvider>
  );
}
export const getTelegramData = () => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    const webApp = (window as any).Telegram.WebApp;
    return {
      initData: webApp.initData,
      initDataUnsafe: webApp.initDataUnsafe,
      themeParams: webApp.themeParams,
      colorScheme: webApp.colorScheme,
      expand: () => webApp.expand(),
      ready: () => webApp.ready(),
      hapticFeedback: webApp.HapticFeedback,
    };
  }
  return null;
};

export const isTelegramWebApp = () => {
  return typeof window !== 'undefined' && !!(window as any).Telegram?.WebApp?.initData;
};

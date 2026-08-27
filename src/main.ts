import App from './App';

async function bootstrap() {
  const app = new App();
  await app.init();
  (window as unknown as { __app: App }).__app = app;
}

bootstrap().catch((err) => {
  console.error('Failed to initialize app:', err);
  document.getElementById('app')!.innerHTML =
    '<div style="padding: 40px; text-align: center;">' +
    '<h2 style="margin-bottom: 12px;">Initialization Error</h2>' +
    '<p style="color: var(--text-secondary);">' + (err as Error).message + '</p>' +
    '</div>';
});

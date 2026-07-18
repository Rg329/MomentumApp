/** Public legal document URLs — required for App Store / Play Store listings. */
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ||
  'https://momentumapp.focus/privacy';

export const TERMS_OF_SERVICE_URL =
  process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL?.trim() ||
  'https://momentumapp.focus/terms';

export async function openLegalUrl(url: string): Promise<void> {
  const { Linking } = await import('react-native');
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error('Could not open link.');
  }
  await Linking.openURL(url);
}

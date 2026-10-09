export const resolveGooglePrivateKey = () => {
  const encodedPrivateKey = process.env.GOOGLE_PRIVATE_KEY_B64;
  const privateKey = encodedPrivateKey
    ? Buffer.from(encodedPrivateKey, 'base64').toString('utf8')
    : process.env.GOOGLE_PRIVATE_KEY;

  return privateKey?.replace(/\\n/g, '\n');
};

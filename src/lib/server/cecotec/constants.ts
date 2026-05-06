export const CECOTEC_BASE_URL = "https://product.kitchenidea.org";

// RSA public key extracted from the Cecotec app (jadx decompilation)
export const CECOTEC_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDLO8Q53Z2dlSse9AC/EQSDvihR
Gl7t3B4XVVymgY5quz+zIKibzm0P7xBVSose8trkou3rybMND2m3P2AueqH6oWTC
TC9aJNIkKjDQ8HHAQk9fnU7ZHpoJv5QD8k3gaqEJrTnYkPVZKDW2u66yN6ftNHTc
abZCqviBYwECcCamzwIDAQAB
-----END PUBLIC KEY-----`;

// "sword:sword_secret" base64-encoded
export const OAUTH_BASIC_AUTH = "Basic c3dvcmQ6c3dvcmRfc2VjcmV0";

export const COMMON_HEADERS: Record<string, string> = {
  "cloud-kit-app-language": "en",
  "cloud-kit-app-type": "android",
  "cloud-kit-cur-app-version": "1.9.9",
  "user-agent": "Dart/2.16 (dart:io)",
};

// Shared by the offline publisher and download API. A package's purpose is part of its identity.
export const bundleIdentity = (packageId, toolCodes) => `${packageId}\n${[...new Set(toolCodes)].sort().join('\n')}`;

export declare function hasReplitConnector(): boolean;
export declare function hasNotionAuth(): boolean;
export declare function resolveNotionToken(): Promise<string>;
export declare function createNotionClient<T>(clientModule: {
  Client: new (options: { auth: string }) => T;
}): Promise<T>;
export declare function clearNotionAuthCache(): void;

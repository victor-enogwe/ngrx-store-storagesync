import { IStorageSyncOptions } from './models/storage-sync-options';

export const rehydrateState = <T>({
  storage,
  storageKeySerializer,
  features,
  storageError
}: IStorageSyncOptions): T => {
  return features.reduce<T>(
    (acc, curr) => {
      const { storageKeySerializerForFeature, stateKey, deserialize, storageForFeature } = curr;

      const key = storageKeySerializerForFeature
        ? storageKeySerializerForFeature(stateKey)
        : storageKeySerializer(stateKey);

      try {
        const featureState = storageForFeature ? storageForFeature.getItem(key) : storage.getItem(key);
        return featureState
          ? {
              ...acc,
              ...{
                [stateKey]: deserialize
                  ? deserialize<T>(featureState)
                  : JSON.parse(featureState, (_: string, value: string) => {
                      // parse ISO date strings
                      return /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.test(String(value))
                        ? new Date(value)
                        : value;
                    })
              }
            }
          : acc;
      } catch (e) {
        if (storageError) {
          storageError(e);
        } else {
          throw e;
        }
      }
    },
    {} as T
  );
};
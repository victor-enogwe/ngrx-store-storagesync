import { createFeatureSelector, createSelector } from '@ngrx/store';
import { IFormSyncState } from './form.reducer';

export const getFormSyncState = createFeatureSelector<IFormSyncState>('form');
export const getFormSyncValue = createSelector(
  getFormSyncState,
  (state: IFormSyncState, { id }: { id: string }) => state[id]
);

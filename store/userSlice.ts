import { User, UserState } from '@/types/types';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';


const initialState = null as UserState;

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (_state, action: PayloadAction<UserState>) => action.payload,
    updateUser: (state, action: PayloadAction<Partial<User>>) => ({
      ...(state ?? {}),
      ...action.payload,
    }),
    clearUser: () => initialState,
  },
});

export const { setUser, updateUser, clearUser } = userSlice.actions;
export const userReducer = userSlice.reducer;

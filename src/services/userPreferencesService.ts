import { apiClient } from "./apiClient";

export const userPreferencesService = {
  get() {
    return apiClient.get<{ language: string }>("/users/me/preferences");
  },
  update(language: string) {
    return apiClient.patch<{ language: string }>("/users/me/preferences", { language });
  },
};


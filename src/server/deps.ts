import { isMock } from "./config";
import { resendMailer } from "./email";
import { mockMailer, mockStore } from "./mock";
import { sheetsStore } from "./sheets";
import type { Mailer, RegistrationStore } from "./types";

export const getDeps = (): { store: RegistrationStore; mailer: Mailer } =>
  isMock() ? { store: mockStore, mailer: mockMailer } : { store: sheetsStore, mailer: resendMailer };

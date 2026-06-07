import { SetMetadata } from '@nestjs/common';
import { AppAction, AppSubject } from '../ability/ability.types';

export const POLICY_ACTION_KEY = 'policy:action';
export const POLICY_RESOURCE_KEY = 'policy:resource';

export const PolicyResource = (subject: AppSubject) =>
  SetMetadata(POLICY_RESOURCE_KEY, subject);

export const PolicyAction = (action: AppAction) =>
  SetMetadata(POLICY_ACTION_KEY, action);

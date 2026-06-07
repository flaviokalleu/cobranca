declare module '@casl/ability' {
  export class AbilityBuilder<T> {
    constructor(createAbility: unknown);
    can(action: string | string[], subject: string | string[]): void;
    build(): T;
  }
  export function createMongoAbility(): MongoAbility;
  export type MongoAbility<T = any> = {
    can(action: string, subject: string): boolean;
  };
}

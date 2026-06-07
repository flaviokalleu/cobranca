import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { JwtUser } from '../jwt-user.interface';
import { AppAction, AppSubject } from './ability.types';

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

const financialSubjects: AppSubject[] = [
  'AccountPlan',
  'Alert',
  'Charge',
  'ChargeTemplate',
  'CustomerPortal',
  'Payable',
  'Finance',
  'FinancialEntry',
  'NFe',
  'Loan',
  'Notification',
  'OpenFinance',
  'PersonalFinance',
  'Purchase',
  'Reconciliation',
  'Search',
  'Supplier',
  'Tax',
];

const commercialSubjects: AppSubject[] = [
  'Alert',
  'Customer',
  'Lead',
  'Charge',
  'ChargeTemplate',
  'CustomerPortal',
  'Calendar',
  'Task',
  'Sale',
  'Search',
];

const operationsSubjects: AppSubject[] = [
  'Alert',
  'Customer',
  'Document',
  'Calendar',
  'Task',
  'Product',
  'Supplier',
  'Stock',
  'Purchase',
  'Sale',
  'Search',
];

@Injectable()
export class AbilityFactory {
  createForUser(user: JwtUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
      can('manage', 'all');
      return build();
    }

    if (user.role === 'FINANCE') {
      can(['create', 'read', 'update', 'delete', 'pay', 'send', 'import', 'export', 'report'], financialSubjects);
      can('read', ['Customer', 'Lead', 'Calendar', 'Task', 'Product', 'Supplier', 'Sale', 'Alert', 'Search']);
      can(['create', 'update'], ['Calendar', 'Task']);
    }

    if (user.role === 'COMMERCIAL') {
      can(['create', 'read', 'update', 'send', 'import', 'export'], commercialSubjects);
      can('read', ['Document', 'Notification', 'Finance', 'Loan', 'PersonalFinance', 'NFe', 'Alert']);
      can(['create', 'update'], ['Notification']);
    }

    if (user.role === 'OPERATIONS') {
      can(['create', 'read', 'update', 'delete', 'import', 'export'], operationsSubjects);
      can('read', ['Charge', 'Payable', 'Finance', 'Notification', 'PersonalFinance', 'Alert']);
      can(['create', 'update'], ['Notification']);
    }

    if (user.role === 'USER') {
      can('read', [
        'Customer',
        'Charge',
        'FinancialEntry',
        'Loan',
        'Notification',
        'Calendar',
        'Task',
        'PersonalFinance',
        'Alert',
        'Search',
      ]);
      can(['create', 'update', 'delete'], ['Task', 'PersonalFinance']);
      can(['create', 'update'], ['Notification']);
    }

    if (user.role === 'AGENT') {
      can(['create', 'read', 'update', 'send'], [
        'Customer',
        'Lead',
        'Charge',
        'Notification',
        'Calendar',
        'Task',
        'PersonalFinance',
        'Search',
      ]);
      can('read', ['Finance', 'FinancialEntry', 'Loan', 'Document', 'Product', 'Supplier', 'Settings', 'Alert']);
    }

    return build();
  }
}

import { KeystoneContext } from '../../types';
import { accessReturnError, filterAccessError } from './graphql-errors';
import { InitialisedList } from './types-for-lists';

export async function checkFilterOrderAccess(
  things: { fieldKey: string; list: InitialisedList }[],
  context: KeystoneContext,
  operation: 'filter' | 'orderBy'
) {
  const failures: string[] = [];
  const returnTypeErrors: any[] = [];
  for (const { fieldKey, list } of things) {
    const field = list.fields[fieldKey];
    const rule = field.graphql.isEnabled[operation];
    // Check isOrderable
    if (!rule) {
      // If the field is explicitly false, it will excluded from the GraphQL API.
      throw new Error('Assert failed');
    } else if (typeof rule === 'function') {
      // Apply dynamic rules
      const result = await rule({
        context,
        session: context.session,
        listKey: list.listKey,
        fieldKey,
      });
      const resultType = typeof result;

      // It's important that we don't cast objects to truthy values, as there's a strong chance that the user
      // has made a mistake.
      if (resultType !== 'boolean') {
        const func = operation === 'filter' ? 'isFilterable' : 'isOrderable';
        returnTypeErrors.push({ tag: `${list.listKey}.${fieldKey}.${func}`, returned: resultType });
      } else if (!result) {
        failures.push(`${list.listKey}.${fieldKey}`);
      }
    }
  }
  if (returnTypeErrors.length) {
    throw accessReturnError(returnTypeErrors);
  }
  if (failures.length) {
    throw filterAccessError({ operation, fieldKeys: failures });
  }
}
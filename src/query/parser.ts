import { isSortingOption, sortingOptions } from "./query";
import type { Query } from "./query";
import YAML from "yaml";

export class ParsingError extends Error {
  inner: Error | undefined;

  constructor(msg: string, inner: Error | undefined = undefined) {
    super(msg);
    this.inner = inner;
  }

  public toString(): string {
    if (this.inner) {
      return `${this.message}: '${this.inner}'`;
    }

    return super.toString();
  }
}

export function parseQuery(pendingQuery: any): Query {
  let obj: any;

  try {
    obj = tryParseAsJson(pendingQuery.source);
  } catch (e) {
    try {
      obj = tryParseAsYaml(pendingQuery.source);
    } catch (e) {
      throw new ParsingError("Unable to parse as YAML or JSON");
    }
  }
  
  pendingQuery.parsedObj = obj;
  return parseObject(pendingQuery);
}

function tryParseAsJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new ParsingError("Invalid JSON", e);
  }
}

function tryParseAsYaml(raw: string): any {
  try {
    return YAML.parse(raw);
  } catch (e) {
    throw new ParsingError("Invalid YAML", e);
  }
}

function parseObject(pendingQuery: any): Query {
  let query = pendingQuery.parsedObj;
  
  if (!query.hasOwnProperty("name") || query.name === null) {
    throw new ParsingError("Missing field 'name' in query");
  }

  if (!query.hasOwnProperty("filter") || query.filter === null) {
    throw new ParsingError("Missing field 'filter' in query");
  }
  query.filter = query.filter.replace(/{{filename}}/g, pendingQuery.ctx.sourcePath.replace(/.*\//, '').replace(/\.md$/i, '').replace(/\s+/g, '*'));
  
  if (
    query.hasOwnProperty("autorefresh") &&
    (isNaN(query.autorefresh) || (query.autorefresh as number) < 0)
  ) {
    throw new ParsingError("'autorefresh' field must be a positive number.");
  }

  if (query.hasOwnProperty("sorting")) {
    if (!Array.isArray(query.sorting)) {
      throw new ParsingError(
        `'sorting' field must be an array of strings within the set [${formatSortingOpts()}].`
      );
    }

    const sorting = query.sorting as any[];

    for (const element of sorting) {
      if (!(typeof element == "string") || !isSortingOption(element)) {
        throw new ParsingError(
          `'sorting' field must be an array of strings within the set [${formatSortingOpts()}].`
        );
      }
    }
  }

  if (query.hasOwnProperty("group") && typeof query.group != "boolean") {
    throw new ParsingError("'group' field must be a boolean.");
  }

  return query as Query;
}

function formatSortingOpts(): string {
  return sortingOptions.map((e) => `'${e}'`).join(", ");
}

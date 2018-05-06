import { BlockClass, BlockFactory, isBlockClass } from "@css-blocks/core";
import * as path from "path";
import { Position, TextDocument } from "vscode";

export function getCurrentLine(document: TextDocument, position: Position) {
  return document.getText(document.lineAt(position).range);
}

export function genImportRegExp(key: string) {
  const file = "(.+\\.\\S{1,2}ss)";
  const fromOrRequire = "(?:from\\s+|=\\s+require(?:<any>)?\\()";
  const requireEndOptional = "\\)?";
  const pattern = `${key}\\s+${fromOrRequire}["']${file}["']${requireEndOptional}`;
  return new RegExp(pattern);
}

export function findImportPath(text: string, key: string, parentPath: string) {
  const re = genImportRegExp(key);
  const results = re.exec(text);
  if (!!results && results.length > 0) {
    return path.resolve(parentPath, results[1]);
  } else {
    return "";
  }
}

export enum SuggestionType {
  Class,
  State,
}

type Suggestion = {
  type: SuggestionType;
  name: string;
};

function getStateSuggestions(klass: BlockClass): Array<Suggestion> {
  const suggestions: Array<Suggestion> = [];
  for (let state of klass.attributes()) {
    suggestions.push({
      type: SuggestionType.State,
      name: state.name,
    });
  }
  return suggestions;
}

export function getSuggestions(filePath: string, keyword: string): Promise<Array<Suggestion>> {
  if (!keyword) {
    keyword = ":scope";
  }

  let factory = new BlockFactory({});
  return factory.getBlockFromPath(filePath).then((block) => {
    let suggestions: Array<Suggestion> = [];
    if (keyword === ":scope") {
      for (let klass of block.classes) {
        if (klass.isRoot) continue;
        suggestions.push({
          type: SuggestionType.Class,
          name: klass.name,
        });
      }
      suggestions = suggestions.concat(getStateSuggestions(block.rootClass));
    } else {
      let klass = block.lookup(`.${keyword}`);
      if (klass && isBlockClass(klass)) {
        suggestions = suggestions.concat(getStateSuggestions(klass));
      }
    }
    return suggestions;
  });
}

/*
 * Copyright 2020 The Yorkie Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// @ts-ignore
import * as GraphemeSplitter from 'grapheme-splitter';
import { logger } from '../../util/logger';
import { TimeTicket } from '../time/ticket';
import { TextElement } from './element';
import {
  Change,
  ChangeType,
  RGATreeSplit,
  RGATreeSplitNodeRange,
  Selection,
} from './rga_tree_split';

/**
 * `PlainTextValue` is a value of PlainText.
 */
export class PlainTextValue {
  private content: string;

  constructor(content: string) {
    this.content = content;
  }

  /**
   * `create` creates a instance of PlainTextValue.
   */
  public static create(content: string): PlainTextValue {
    return new PlainTextValue(content);
  }

  /**
   * `length` returns the length of content.
   */
  public get length(): number {
    const splitter = new GraphemeSplitter();
    return splitter.splitGraphemes(this.content).length;
  }

  /**
   * `substring` returns a sub-string value of the given range.
   */
  public substring(indexStart: number, indexEnd: number): PlainTextValue {
    const splitter = new GraphemeSplitter();
    const split = splitter.splitGraphemes(this.content);
    const value = new PlainTextValue(
      split.slice(indexStart, indexEnd).join(''),
    );
    return value;
  }

  /**
   * `toString` returns content.
   */
  public toString(): string {
    return this.content;
  }

  /**
   * `toJSON` returns the JSON encoding of this.
   */
  public toJSON(): string {
    return this.content;
  }

  /**
   * `getContent` returns content.
   */
  public getContent(): string {
    return this.content;
  }
}

/**
 * `PlainText` represents plain text element
 * Text is an extended data type for the contents of a text editor
 */
export class PlainText extends TextElement {
  private onChangesHandler?: (changes: Array<Change>) => void;
  private rgaTreeSplit: RGATreeSplit<PlainTextValue>;
  private selectionMap: Map<string, Selection>;
  private remoteChangeLock: boolean;

  constructor(
    rgaTreeSplit: RGATreeSplit<PlainTextValue>,
    createdAt: TimeTicket,
  ) {
    super(createdAt);
    this.rgaTreeSplit = rgaTreeSplit;
    this.selectionMap = new Map();
    this.remoteChangeLock = false;
  }

  /**
   * `create` creates a new instance of `PlainText`.
   */
  public static create(
    rgaTreeSplit: RGATreeSplit<PlainTextValue>,
    createdAt: TimeTicket,
  ): PlainText {
    return new PlainText(rgaTreeSplit, createdAt);
  }

  /**
   * Don't use edit directly. Be sure to use it through a proxy.
   * The reason for setting the PlainText type as the return value
   * is to provide the PlainText interface to the user.
   */
  public edit(fromIdx: number, toIdx: number, content: string): PlainText {
    logger.fatal(
      `unsupported: this method should be called by proxy, ${fromIdx}-${toIdx} ${content}`,
    );
    // @ts-ignore
    return;
  }

  /**
   * `editInternal` edits the given range with the given content.
   */
  public editInternal(
    range: RGATreeSplitNodeRange,
    content: string,
    editedAt: TimeTicket,
    latestCreatedAtMapByActor?: Map<string, TimeTicket>,
  ): Map<string, TimeTicket> {
    const value = content ? PlainTextValue.create(content) : undefined;
    const [caretPos, latestCreatedAtMap, changes] = this.rgaTreeSplit.edit(
      range,
      editedAt,
      value,
      latestCreatedAtMapByActor,
    );

    const selectionChange = this.updateSelectionPriv(
      [caretPos, caretPos],
      editedAt,
    );
    if (selectionChange) {
      changes.push(selectionChange);
    }

    if (this.onChangesHandler) {
      this.remoteChangeLock = true;
      this.onChangesHandler(changes);
      this.remoteChangeLock = false;
    }

    return latestCreatedAtMap;
  }

  /**
   * Don't use updateSelection directly. Be sure to use it through a proxy.
   */
  public updateSelection(fromIdx: number, toIdx: number): void {
    logger.fatal(
      `unsupported: this method should be called by proxy, ${fromIdx}-${toIdx}`,
    );
    // @ts-ignore
    return;
  }

  /**
   * `updateSelectionInternal` updates selection info of the given selection range.
   */
  public updateSelectionInternal(
    range: RGATreeSplitNodeRange,
    updatedAt: TimeTicket,
  ): void {
    if (this.remoteChangeLock) {
      return;
    }

    const change = this.updateSelectionPriv(range, updatedAt);
    if (this.onChangesHandler && change) {
      this.remoteChangeLock = true;
      this.onChangesHandler([change]);
      this.remoteChangeLock = false;
    }
  }

  /**
   * `hasRemoteChangeLock` checks whether remoteChangeLock has.
   */
  public hasRemoteChangeLock(): boolean {
    return this.remoteChangeLock;
  }

  /**
   * onChanges registers a handler of onChanges event.
   */
  public onChanges(handler: (changes: Array<Change>) => void): void {
    this.onChangesHandler = handler;
  }

  /**
   * `createRange` returns pair of RGATreeSplitNodePos of the given integer offsets.
   */
  public createRange(fromIdx: number, toIdx: number): RGATreeSplitNodeRange {
    const fromPos = this.rgaTreeSplit.findNodePos(fromIdx);
    if (fromIdx === toIdx) {
      return [fromPos, fromPos];
    }

    return [fromPos, this.rgaTreeSplit.findNodePos(toIdx)];
  }

  /**
   * `toJSON` returns the JSON encoding of this text.
   */
  public toJSON(): string {
    return `"${this.rgaTreeSplit.toJSON()}"`;
  }

  /**
   * `toSortedJSON` returns the sorted JSON encoding of this text.
   */
  public toSortedJSON(): string {
    return this.toJSON();
  }

  /**
   * `getValue` returns the JSON encoding of rgaTreeSplit.
   */
  public getValue(): string {
    return this.rgaTreeSplit.toJSON();
  }

  /**
   * `getRGATreeSplit` returns the rgaTreeSplit.
   */
  public getRGATreeSplit(): RGATreeSplit<PlainTextValue> {
    return this.rgaTreeSplit;
  }

  /**
   * `getAnnotatedString` returns a String containing the meta data of the text.
   */
  public getAnnotatedString(): string {
    return this.rgaTreeSplit.getAnnotatedString();
  }

  /**
   * `getRemovedNodesLen` returns length of removed nodes.
   */
  public getRemovedNodesLen(): number {
    return this.rgaTreeSplit.getRemovedNodesLen();
  }

  /**
   * `cleanupRemovedNodes` cleans up nodes that have been removed.
   * The cleaned nodes are subject to garbage collector collection.
   */
  public cleanupRemovedNodes(ticket: TimeTicket): number {
    return this.rgaTreeSplit.cleanupRemovedNodes(ticket);
  }

  /**
   * `deepcopy` copies itself deeply.
   */
  public deepcopy(): PlainText {
    const text = PlainText.create(
      this.rgaTreeSplit.deepcopy(),
      this.getCreatedAt(),
    );
    text.remove(this.getRemovedAt());
    return text;
  }

  private updateSelectionPriv(
    range: RGATreeSplitNodeRange,
    updatedAt: TimeTicket,
  ): Change | undefined {
    if (!this.selectionMap.has(updatedAt.getActorID()!)) {
      this.selectionMap.set(
        updatedAt.getActorID()!,
        Selection.of(range, updatedAt),
      );
      return;
    }

    const prevSelection = this.selectionMap.get(updatedAt.getActorID()!);
    if (updatedAt.after(prevSelection!.getUpdatedAt())) {
      this.selectionMap.set(
        updatedAt.getActorID()!,
        Selection.of(range, updatedAt),
      );

      const [from, to] = this.rgaTreeSplit.findIndexesFromRange(range);
      return {
        type: ChangeType.Selection,
        actor: updatedAt.getActorID()!,
        from,
        to,
      };
    }
  }
}

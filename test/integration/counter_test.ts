import { assert } from 'chai';
import { Document } from '@yorkie-js-sdk/src/document/document';
import { withTwoClientsAndDocuments } from '@yorkie-js-sdk/test/integration/integration_helper';
import { Counter } from '@yorkie-js-sdk/src/yorkie';

describe('Counter', function () {
  it('can be increased by Counter type', function () {
    const doc = Document.create<{
      k1: { age?: Counter; length?: Counter };
    }>('test-doc');

    doc.update((root) => {
      root.k1 = {};
      root.k1.age = new Counter(1);
      root.k1.length = new Counter(10.5);
      root.k1.age.increase(5);
      root.k1.length.increase(3.5);
    });
    assert.equal(`{"k1":{"age":6,"length":14}}`, doc.toSortedJSON());

    doc.update((root) => {
      root.k1.age?.increase(1.5).increase(1);
      root.k1.length?.increase(3.5).increase(1);
    });
    assert.equal(`{"k1":{"age":8.5,"length":18.5}}`, doc.toSortedJSON());

    // error test
    assert.Throw(() => {
      doc.update((root) => {
        root.k1.age?.increase(true as any);
      });
    }, 'Unsupported type of value: boolean');
    assert.equal(`{"k1":{"age":8.5,"length":18.5}}`, doc.toSortedJSON());
  });

  it('Can handle increase operation', async function () {
    type TestDoc = { age: Counter; length: Counter };
    await withTwoClientsAndDocuments<TestDoc>(async (c1, d1, c2, d2) => {
      d1.update((root) => {
        root.age = new Counter(0);
      });
      d1.update((root) => {
        root.age.increase(1).increase(2);
        root.length = new Counter(10);
      });

      await c1.sync();
      await c2.sync();
      assert.equal(d1.toSortedJSON(), d2.toSortedJSON());
    }, this.test!.title);
  });

  it('Can handle concurrent increase operation', async function () {
    await withTwoClientsAndDocuments<{
      age: Counter;
      width: Counter;
      height: Counter;
    }>(async (c1, d1, c2, d2) => {
      d1.update((root) => {
        root.age = new Counter(0);
        root.width = new Counter(0);
        root.height = new Counter(0);
      });
      await c1.sync();
      await c2.sync();
      assert.equal(d1.toSortedJSON(), d2.toSortedJSON());

      d1.update((root) => {
        root.age.increase(1).increase(2);
        root.width.increase(10);
      });
      d2.update((root) => {
        root.age.increase(3.14).increase(2);
        root.width = new Counter(2.5);
      });
      await c1.sync();
      await c2.sync();
      await c1.sync();

      assert.equal(d1.toSortedJSON(), d2.toSortedJSON());
    }, this.test!.title);
  });
});

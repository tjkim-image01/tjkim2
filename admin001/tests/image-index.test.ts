import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scanImageRoots } from '../src/lib/image-index.ts'
import { itemImages } from '../src/lib/image-match.ts'
import type { IndexResult } from '../src/lib/api.ts'

const folder = (id: string, path: string) => ({ id, path, name: path.split('/').at(-1)! })
const file = (id: string, name: string, folderId: string) => ({ id, name, folderId })

test('one registered parent connects photos in year folders and product folders', async () => {
  const index = await scanImageRoots([{ id: 'root', name: 'Photos' }], async () => ({
    rootId: 'root', truncated: false,
    folders: [folder('root', 'Photos'), folder('year', 'Photos/AB2025'), folder('product', 'Photos/AB2025/ABKC151214885A')],
    files: [file('one', '[크기변환]ABKC250416081 (2).jpg', 'year'), file('two', 'IMG_0001.jpg', 'product')],
  }), () => {})
  assert.deepEqual(itemImages(index, 'ABKC250416081').map((image) => image.id), ['one'])
  assert.deepEqual(itemImages(index, 'ABKC151214885A').map((image) => image.id), ['two'])
  assert.equal(itemImages(index, 'ABKC151214885').length, 0)
})

test('a truncated parent continues through all child branches and deduplicates files', async () => {
  const responses: Record<string, IndexResult> = {
    root: { rootId: 'root', truncated: true, folders: [folder('root', 'Photos'), folder('a', 'Photos/A'), folder('b', 'Photos/B')], files: [file('one', 'CODE1.jpg', 'a')] },
    a: { rootId: 'a', truncated: false, folders: [folder('a', 'A')], files: [file('one', 'CODE1.jpg', 'a')] },
    b: { rootId: 'b', truncated: false, folders: [folder('b', 'B')], files: [file('two', 'CODE2.jpg', 'b')] },
  }
  const calls: string[] = []
  const index = await scanImageRoots([{ id: 'root', name: 'Photos' }], async (id) => { calls.push(id); return responses[id] }, () => {})
  assert.deepEqual(calls, ['root', 'a', 'b'])
  assert.equal(index.fileCount, 2)
  assert.equal(itemImages(index, 'CODE2')[0].path, 'Photos/B')
})

test('folders at the API depth limit are scanned again to recover deeper photos', async () => {
  const calls: string[] = []
  const index = await scanImageRoots([{ id: 'root', name: 'Photos' }], async (id) => {
    calls.push(id)
    return id === 'root' ? {
      rootId: id, truncated: false,
      folders: [folder('root', 'Photos'), folder('deep', 'Photos/one/two/three/four')], files: [],
    } : {
      rootId: id, truncated: false,
      folders: [folder('deep', 'four'), folder('product', 'four/CODE')], files: [file('photo', 'IMG_1.jpg', 'product')],
    }
  }, () => {})
  assert.deepEqual(calls, ['root', 'deep'])
  assert.equal(itemImages(index, 'CODE')[0].path, 'Photos/one/two/three/four/CODE')
})

test('overlapping registered roots do not duplicate pictures', async () => {
  const index = await scanImageRoots([{ id: 'root', name: 'Photos' }, { id: 'root', name: 'Photos again' }], async () => ({
    rootId: 'root', truncated: false, folders: [folder('root', 'Photos')], files: [file('one', 'CODE.jpg', 'root')],
  }), () => {})
  assert.equal(index.fileCount, 1)
  assert.deepEqual(index.rootIds, ['root'])
})

test('unrecoverable API limits fail instead of replacing a complete index with a partial one', async () => {
  await assert.rejects(scanImageRoots([{ id: 'root', name: 'Photos' }], async () => ({
    rootId: 'root', truncated: true, folders: [folder('root', 'Photos')], files: [],
  }), () => {}), /기존 사진 목록을 유지/)
})

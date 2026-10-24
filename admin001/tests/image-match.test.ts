import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { driveId, findCandidates, imageCodeKey, imagesInLinkedFolder, itemImages, type ImageIndex } from '../src/lib/image-match.ts'

const snapshot: ImageIndex = JSON.parse(readFileSync(new URL('../public/drive-image-index.json', import.meta.url), 'utf8'))

test('all four inventory groups have images in the published lookup', () => {
  for (const prefix of ['ab', 'am', 'ao', 'ap']) {
    assert.ok(Object.keys(snapshot.byFileKey).some((key) => key.startsWith(prefix)), prefix)
  }
  assert.equal(snapshot.version, 2)
  assert.deepEqual(snapshot.truncatedRoots, [])
})

test('previously missing drawings and genre paintings resolve to their own photos', () => {
  for (const [code, count] of [['APKC230429075', 10], ['APAC241028216A', 5], ['APAC160630057', 3], ['APAC160630058', 5]] as const) {
    const images = itemImages(snapshot, code)
    assert.equal(images.length, count, code)
    for (const image of images) assert.equal(imageCodeKey(image.name, true), imageCodeKey(code))
    assert.equal(findCandidates(snapshot, code).reduce((total, candidate) => total + candidate.fileIds.length, 0), count)
  }
})

test('matching supports numbered copies and WebP without merging neighbouring product codes', () => {
  assert.equal(imageCodeKey(' APKC230429075 (9).WEBP ', true), imageCodeKey('APKC230429075'))
  assert.notEqual(imageCodeKey('APKC230429075A'), imageCodeKey('APKC230429075'))
  assert.notEqual(imageCodeKey('AB123-1'), imageCodeKey('AB1231'))
  assert.equal(itemImages(snapshot, 'not-a-product').length, 0)
})

test('year folders only display the requested item and an absent item stays empty', () => {
  const images = [{ name: 'APAC160630057 (1).jpg' }, { name: 'APAC160630058 (1).jpg' }]
  assert.deepEqual(imagesInLinkedFolder(images, 'APAC160630057', true), [images[0]])
  assert.deepEqual(imagesInLinkedFolder(images, 'APAC160630059', true), [])
  const manual = [{ name: 'IMG_001.jpg' }]
  assert.deepEqual(imagesInLinkedFolder(manual, 'APAC160630057', false), manual)
})

test('notes in image columns are ignored while valid IDs and Drive URLs work', () => {
  assert.equal(driveId('국립한글박물관26-0401'), '')
  const id = '1Fo9bQbxVe_zb_2njyBLVcl6VMUf3SJlS'
  assert.equal(driveId(id), id)
  assert.equal(driveId(`https://drive.google.com/file/d/${id}/view`), id)
  assert.equal(driveId(`https://example.com/file/d/${id}/view`), '')
})

test('duplicate roots do not duplicate images, and numbering sorts naturally', () => {
  const first = { id: 'a', name: 'CODE (2).jpg', folderId: 'year', folderName: 'AP2023' }
  const index: ImageIndex = { ...snapshot, byFileKey: { code: [first, { ...first, id: 'b', name: 'CODE (10).jpg' }, first] } }
  assert.deepEqual(itemImages(index, 'CODE').map((image) => image.id), ['a', 'b'])
})

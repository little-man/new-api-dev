/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { describe, expect, it } from 'vitest'

import type { ShowcaseModel } from '../../hooks/use-showcase-models'
import {
  buildSnippet,
  resolveSnippetTargets,
  type SnippetTarget,
} from '../quickstart-snippets'

function makeModel(overrides: Partial<ShowcaseModel>): ShowcaseModel {
  return {
    id: 'demo-model',
    name: 'demo-model',
    vendor: 'Demo',
    initials: 'DE',
    tone: '',
    kind: 'text',
    endpointTypes: [],
    tags: [],
    perRequest: false,
    platformInput: 1,
    platformOutput: 2,
    free: false,
    ...overrides,
  }
}

const CTX = { baseUrl: 'https://api.example.com', modelName: 'demo-model' }

describe('resolveSnippetTargets', () => {
  it('offers every endpoint the backend actually reports', () => {
    const targets = resolveSnippetTargets(
      makeModel({ endpointTypes: ['openai', 'embeddings'] })
    )
    expect(targets.map((target) => target.path)).toEqual([
      '/v1/chat/completions',
      '/v1/embeddings',
    ])
  })

  it('falls back to the model family when endpoint types are missing', () => {
    expect(
      resolveSnippetTargets(makeModel({ kind: 'image' })).map((t) => t.kind)
    ).toEqual(['image'])
    expect(
      resolveSnippetTargets(makeModel({ kind: 'embedding' })).map((t) => t.kind)
    ).toEqual(['embedding'])
    expect(
      resolveSnippetTargets(makeModel({ kind: 'vision' })).map((t) => t.kind)
    ).toEqual(['chat'])
  })

  it('never invents a snippet for families without a plain request shape', () => {
    expect(resolveSnippetTargets(makeModel({ kind: 'video' }))).toEqual([])
    expect(resolveSnippetTargets(makeModel({ kind: 'audio' }))).toEqual([])
    expect(
      resolveSnippetTargets(makeModel({ endpointTypes: ['openai-video'] }))
    ).toEqual([])
  })
})

describe('buildSnippet', () => {
  const chat: SnippetTarget = {
    kind: 'chat',
    path: '/v1/chat/completions',
    labelKey: 'Chat completions',
  }

  it('builds a runnable curl command against the given origin', () => {
    const code = buildSnippet('curl', chat, CTX)
    expect(code).toContain('curl https://api.example.com/v1/chat/completions')
    expect(code).toContain('Authorization: Bearer $NEW_API_KEY')
    expect(code).toContain('"model": "demo-model"')
  })

  it('points the SDK base_url at the origin plus /v1', () => {
    const code = buildSnippet('python', chat, CTX)
    expect(code).toContain('base_url="https://api.example.com/v1"')
    expect(code).toContain('api_key="<YOUR_API_KEY>"')
    expect(code).toContain('model="demo-model"')
  })

  it('escapes model names instead of breaking the string literal', () => {
    const code = buildSnippet('python', chat, {
      baseUrl: CTX.baseUrl,
      modelName: 'weird"model',
    })
    expect(code).toContain('model="weird\\"model"')
  })

  it('uses the endpoint-specific request body', () => {
    const embedding = buildSnippet(
      'javascript',
      { kind: 'embedding', path: '/v1/embeddings', labelKey: 'Embeddings' },
      CTX
    )
    expect(embedding).toContain('https://api.example.com/v1/embeddings')
    expect(embedding).toContain('"input": "Hello!"')
    expect(embedding).not.toContain('messages')
  })
})

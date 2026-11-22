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
import type { ShowcaseModel } from '../hooks/use-showcase-models'

// ----------------------------------------------------------------------------
// Quick-start snippets
//
// Samples are generated only for endpoints this gateway actually serves. When
// `/api/pricing` reports no endpoint types we fall back to the model family,
// and families that cannot be expressed as a plain OpenAI-compatible request
// (video, audio) get no snippet at all instead of a made-up one.
// ----------------------------------------------------------------------------

export type SnippetLang = 'curl' | 'python' | 'javascript'
export type SnippetKind = 'chat' | 'embedding' | 'image'

export const SNIPPET_LANG_LABELS: Record<SnippetLang, string> = {
  curl: 'cURL',
  python: 'Python',
  javascript: 'JavaScript',
}

export type SnippetTarget = {
  kind: SnippetKind
  /** Request path, already prefixed with `/v1`. */
  path: string
  labelKey: string
}

const TARGETS: Record<SnippetKind, SnippetTarget> = {
  chat: {
    kind: 'chat',
    path: '/v1/chat/completions',
    labelKey: 'Chat completions',
  },
  embedding: {
    kind: 'embedding',
    path: '/v1/embeddings',
    labelKey: 'Embeddings',
  },
  image: {
    kind: 'image',
    path: '/v1/images/generations',
    labelKey: 'Image generation',
  },
}

export function resolveSnippetTargets(model: ShowcaseModel): SnippetTarget[] {
  const types = model.endpointTypes
  const targets: SnippetTarget[] = []
  const push = (kind: SnippetKind) => {
    if (!targets.includes(TARGETS[kind])) targets.push(TARGETS[kind])
  }

  if (types.length > 0) {
    if (types.some((type) => type === 'openai' || type === 'openai-response')) {
      push('chat')
    }
    if (types.includes('embeddings')) push('embedding')
    if (types.includes('image-generation')) push('image')
    return targets
  }

  if (model.kind === 'embedding') push('embedding')
  else if (model.kind === 'image') push('image')
  else if (model.kind === 'text' || model.kind === 'vision') push('chat')
  return targets
}

export type SnippetContext = {
  /** Server origin without a trailing slash and without `/v1`. */
  baseUrl: string
  modelName: string
}

const USER_MESSAGE = 'Hello!'

function requestBody(kind: SnippetKind, modelName: string) {
  if (kind === 'embedding') {
    return { model: modelName, input: USER_MESSAGE }
  }
  if (kind === 'image') {
    return { model: modelName, prompt: 'A serene koi pond at sunset.', n: 1 }
  }
  return {
    model: modelName,
    messages: [{ role: 'user', content: USER_MESSAGE }],
  }
}

function buildCurl(target: SnippetTarget, ctx: SnippetContext): string {
  const body = JSON.stringify(requestBody(target.kind, ctx.modelName), null, 2)
  return [
    `curl ${ctx.baseUrl}${target.path} \\`,
    `  -H "Authorization: Bearer $NEW_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${body.replaceAll('\n', '\n     ')}'`,
  ].join('\n')
}

function buildPython(target: SnippetTarget, ctx: SnippetContext): string {
  const model = JSON.stringify(ctx.modelName)
  const header = [
    'from openai import OpenAI',
    '',
    'client = OpenAI(',
    `    base_url=${JSON.stringify(`${ctx.baseUrl}/v1`)},`,
    `    api_key="<YOUR_API_KEY>",`,
    ')',
    '',
  ]

  if (target.kind === 'embedding') {
    return [
      ...header,
      'response = client.embeddings.create(',
      `    model=${model},`,
      `    input=${JSON.stringify(USER_MESSAGE)},`,
      ')',
      '',
      'print(response.data[0].embedding[:8])',
    ].join('\n')
  }
  if (target.kind === 'image') {
    return [
      ...header,
      'response = client.images.generate(',
      `    model=${model},`,
      `    prompt="A serene koi pond at sunset.",`,
      '    n=1,',
      ')',
      '',
      'print(response.data[0].url)',
    ].join('\n')
  }
  return [
    ...header,
    'completion = client.chat.completions.create(',
    `    model=${model},`,
    `    messages=[{"role": "user", "content": ${JSON.stringify(USER_MESSAGE)}}],`,
    ')',
    '',
    'print(completion.choices[0].message.content)',
  ].join('\n')
}

function buildJavaScript(target: SnippetTarget, ctx: SnippetContext): string {
  const body = JSON.stringify(requestBody(target.kind, ctx.modelName), null, 2)
  return [
    `const response = await fetch(${JSON.stringify(`${ctx.baseUrl}${target.path}`)}, {`,
    `  method: "POST",`,
    `  headers: {`,
    `    Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,`,
    `    "Content-Type": "application/json",`,
    `  },`,
    `  body: JSON.stringify(${body.replaceAll('\n', '\n  ')}),`,
    `})`,
    '',
    'console.log(await response.json())',
  ].join('\n')
}

export function buildSnippet(
  lang: SnippetLang,
  target: SnippetTarget,
  ctx: SnippetContext
): string {
  if (lang === 'python') return buildPython(target, ctx)
  if (lang === 'javascript') return buildJavaScript(target, ctx)
  return buildCurl(target, ctx)
}

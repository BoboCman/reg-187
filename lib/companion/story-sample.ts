/**
 * The fictional Apartment story sample, rendered through the real story
 * pipeline (evidence builder, playback, guard, renderer). Never used on a live case.
 */
import { buildEvidencePacket } from "./evidence";
import { splitPages } from "./pages";
import { apartmentSample } from "./samples";
import { SAMPLE_BRANDING } from "./sample-render";
import { STORY_VERSIONS, buildStoryPlayback, finishDraft, storyInputsSchema, writerToText, type StoryDraft } from "./story";
import { buildStoryHtml } from "./story-render";

export function sampleStoryDraft(): StoryDraft {
  const s = apartmentSample();
  const pages = splitPages(s.pagesText);
  const packet = buildEvidencePacket({ atlas1: s.atlas1, atlas2Registry: s.atlas2Registry }, pages, { fingerprint: s.fingerprint, page_count: s.pageCount });
  const inputs = storyInputsSchema.parse({
    story_key: "apartment",
    goals: s.goals,
    beneficiary: "Spouse",
    cover: { prepared_for: "Alex and Jamie Rivera", advisor_name: "Jordan Ellis, CLU", firm_name: SAMPLE_BRANDING.firm_name ?? undefined },
  });
  const playback = buildStoryPlayback(packet, inputs, pages);
  return finishDraft({
    schema_version: STORY_VERSIONS.draft,
    kind: "story",
    story_key: "apartment",
    case_id: "sample",
    revision: 1,
    document_fingerprint: s.fingerprint,
    inputs,
    playback,
    text: writerToText(s.story, playback),
    authors: {},
    versions: { prompt: STORY_VERSIONS.prompt, template: STORY_VERSIONS.template, playback: STORY_VERSIONS.playback },
    writer: { model: "fixture", workflow_version: null },
  });
}

export function sampleStoryHtml(): string {
  return buildStoryHtml(sampleStoryDraft(), SAMPLE_BRANDING, { state: "sample", preparedAt: "2026-11-05T12:00:00Z" });
}

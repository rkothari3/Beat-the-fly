# Beat the Fly

Solo build. Live: https://www.beattheflyapp.tech

## Inspiration

I got tired of AI demos that are a text box over someone else's API. MaleCNS is the opposite: a public fly connectome you can actually run. Almost nobody outside a lab ever touches it.

A poster about wiring diagrams does not stick. A game does. If the edges are junk, you crush the fly. If they matter, it fights back. Thirty seconds, no slide deck.

## What it does

Split-screen Crossy Road. Same roads, same cars. You hop. The fly hops.

On the fly side, three brain regions score the hop, then a search step throws out the suicidal ones. A sidebar atlas lights up as it decides. The start screen has a short Learn path: how the model is built, where those regions sit in the real brain (click through to Neuroglancer), and a chart that compares real wiring to scrambled wiring.

Finish a round and your margin lands on a shared board other people at the venue can see.

## How we built it

Cursor carried the code: game, brain runtime, atlas, Learn UI, match server, deploy workflow. Grok Imagine made the UI mockups and the pixel sprites. I turned those frames into rigged GLBs so the walker and the fly on screen started as generated art, not a downloaded pack.

Client is React and Three.js. Weights stay in the browser. Server is Node. Tiger holds match history as a hypertable, one best row per player, and an hourly continuous aggregate the stats route actually reads. Vultr runs nginx and pm2. Push to main and GitHub Actions rebuilds the live site.

## Challenges we ran into

The brain step finishes instantly. The picture of it thinking does not. I had to squeeze an AL, then MB, then CX flash into the gap before the next hop. Too tight and the glow never leaves the first region. Too loose and people just walk past the fly.

There is also a weight on how hard the brain vote shoves the search. Crank it and the science looks loud while the fly plays dumb. Drop it and you are watching a normal bot in a lab coat.

Grok frames are flat images. Flapping and walking took real rigging. One bad mesh id painted the wrong brain region entirely. Database TLS and SSH deploy keys ate a night.

## Accomplishments that we're proud of

One person, one weekend: a playable opponent, a 3D brain you can watch, a lesson on the home screen, and a public scoreboard that does not die when my laptop sleeps.

The number I care about is the wiring test. Keep the real edges and it tracks a teacher about 95% of the time. Scramble who connects to whom and that falls to about 10%. Same cells. The graph was the skill.

## What we learned

Saying "the AI decided" is a tell. Better to say which part proposed the hop and which part was only there to keep it alive.

Generated art is a head start, not a character. You still have to name bones, play the clip, and notice when the wings are out of sync.

I also learned to check IDs against the dataset, not against a list I assumed was 1-based. Optics lobes are not the central complex, even if the colors look pretty.

## What's next for Beat-the-fly

Let people mute one region at a time and see the fly get worse on the same board.

Light only the cells that voted for that hop, not the whole blob.

A classroom wall: one shared fly, a lot of humans, stats updating beside the game. Then try the same trick on a different public connectome.

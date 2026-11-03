# Perspective and ablation test

Status: proposed protocol; no empirical result claimed.

## Question
Do the five perspective views add measurable information?

## Method
Keep event coordinates and original observations immutable. Append reinterpretations with timestamps. Compare the full system with one perspective or chart input withheld, using the same model and unseen tasks.

## Expected result
Improved locked task scores and provenance retention across held-out contexts.

## What this does not establish
Duplicating one placement across five named views does not create five independent observations.

## Falsification
No incremental predictive benefit rejects the added-information claim; any overwritten historical observation fails the preservation rule.

## Comparison
Single-view, chart-free and shuffled-coordinate ablations.

## Before recruitment
Freeze the operational claim, minimum useful effect, sample size from a power analysis, exclusion rules, missing-data handling, stopping rule, analysis code, model and chart versions. Register primary and exploratory outcomes separately. Use multiplicity correction for primary comparisons. Report effect sizes, confidence intervals, failures and adverse experiences. A nonsignificant underpowered result is inconclusive. Replicate with an independent held-out cohort.

## Participant control
Participation is voluntary and separate from using the app. Explain randomization and any blinding in consent, allow withdrawal, minimize identifying data, and never expose birth details in public network views. Research involving participants needs an appropriate ethics review before recruitment.

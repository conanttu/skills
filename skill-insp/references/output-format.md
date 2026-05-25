# Analysis Output Format

Write this JSON to `<cache_dir>/analysis.json`:

```json
{
  "skill_name": "name from frontmatter",
  "skill_version": "version from metadata, or null",
  "analyzed_at": "ISO 8601 timestamp",
  "readiness": "ready | usable-with-improvements | needs-work",
  "risk_level": "low | medium | high",
  "scores": {
    "structure": 0-10,
    "triggering": 0-15,
    "usability": 0-15,
    "completeness": 0-15,
    "progressive_disclosure": 0-10,
    "testability": 0-10,
    "maintainability": 0-10,
    "safety_trust": 0-15,
    "total": 0-100
  },
  "dimension_rationale": {
    "structure": "Why this score: what's good, what's missing",
    "triggering": "Why this score: what's good, what's missing",
    "usability": "Why this score: what's good, what's missing",
    "completeness": "Why this score: what's good, what's missing",
    "progressive_disclosure": "Why this score: what's good, what's missing",
    "testability": "Why this score: what's good, what's missing",
    "maintainability": "Why this score: what's good, what's missing",
    "safety_trust": "Why this score: what's good, what's missing"
  },
  "strengths": ["up to 5 key strengths"],
  "findings": [
    {
      "priority": "high | medium | low",
      "dimension": "structure | triggering | usability | completeness | progressive_disclosure | testability | maintainability | safety_trust",
      "title": "Brief description",
      "detail": "Why this matters and what you observed",
      "file": "path/to/file",
      "line": 42,
      "recommendation": "Specific actionable fix"
    }
  ],
  "recommendations": [
    {
      "priority": "high | medium | low",
      "dimension": "dimension name",
      "text": "Actionable recommendation"
    }
  ],
  "eval_results": [
    {
      "id": 1,
      "prompt": "Short description of the eval scenario",
      "expectations": [
        {
          "text": "What was expected",
          "pass": true,
          "reason": "Why it passed or failed"
        }
      ],
      "pass": true
    }
  ]
}
```

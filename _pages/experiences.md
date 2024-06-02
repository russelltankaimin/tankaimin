---
layout: archive
title: "School"
permalink: exp/
author_profile: true
---

<button onclick="showContent('../docs/experiences.md')">Experiences</button>
<button onclick="showContent('../docs/skills.md')">Skills</button>

<div id="content">
    <script>showContent('../docs/experiences.md')</script>
</div>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
    function showContent(file) {
        fetch(file)
            .then(response => response.text())
            .then(text => {
                document.getElementById('content').innerHTML = marked.parse(text);
            })
            .catch(error => console.error('Error fetching the markdown file:', error));
    }
</script>



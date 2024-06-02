---
layout: archive
title: "Experiences and Skills"
permalink: /exp/
author_profile: true
---



<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<button onclick="showContent('../docs/experiences.md')">Experiences</button>
<button onclick="showContent('../docs/skills.md')">Skills</button>

<div id="content"></div>

<script>
document.addEventListener("DOMContentLoaded", function() {
        showContent('../docs/experiences.md'); // Load default content
        });
function showContent(file) {
    fetch(file)
        .then(response => response.text())
        .then(text => {
                document.getElementById('content').innerHTML = marked.parse(text);
                })
    .catch(error => console.error('Error fetching the markdown file:', error));
}
</script>

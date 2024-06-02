---
layout: archive
title: "Research"
permalink: /research/
author_profile: true
---

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<div id="content"></div>

<script>
document.addEventListener("DOMContentLoaded", function() {
        showContent('../docs/research.md'); // Load default content
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

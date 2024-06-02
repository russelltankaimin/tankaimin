---
layout: archive
title: "School"
permalink: coursework/
author_profile: true
---



<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<div id="content"></div>

<script>
function showContent(file) {
    fetch(file)
        .then(response => response.text())
        .then(text => {
                document.getElementById('content').innerHTML = marked.parse(text);
                })
    .catch(error => console.error('Error fetching the markdown file:', error));
}
document.addEventListener("DOMContentLoaded", function() {
        showContent('../docs/nus.md'); // Load default content
        });
</script>

<button onclick="showContent('../docs/nus.md')">Education</button>
<button onclick="showContent('../docs/coursework.md')">Coursework</button>
<button onclick="showContent('../docs/studyplan.md')">Study Plan</button>


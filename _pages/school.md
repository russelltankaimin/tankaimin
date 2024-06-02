---
layout: archive
title: "School"
permalink: coursework/
author_profile: true
---



<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

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
<button onclick="()=> {
    fetch('../docs/nus.md')
    .then(res => res.text())
    .then(text => {
        document.getElementById('content').innerHTML = marked.parse(text);
        })}">Education</button>
<button onclick="()=> {
    fetch('../docs/coursework.md')
    .then(res => res.text())
    .then(text => {
        document.getElementById('content').innerHTML = marked.parse(text);
        })}">Coursework</button>
<button onclick="()=> {
    fetch('../docs/studyplan.md')
    .then(res => res.text())
    .then(text => {
        document.getElementById('content').innerHTML = marked.parse(text);
        })}">Study Plan</button>
<div id="content"></div>


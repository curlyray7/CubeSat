fetch('/api/status')
    .then(response => response.json())
    .then(data => {
        const statusDiv = document.getElementById('db-status');
        if (data.status === "success") {
            statusDiv.style.color = "green";
            statusDiv.innerText = data.message;
        } else {
            statusDiv.style.color = "red";
            statusDiv.innerText = data.message;
        }
    });
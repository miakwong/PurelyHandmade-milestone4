let commentArr = [];

(() => {
    let commentsString = localStorage.getItem("commentArr");
    if (commentsString !== null) {
        commentArr = JSON.parse(commentsString).map(comment => ({
            ...comment,
            lastUpdated: new Date(comment.lastUpdated),
            upvotes: parseInt(comment.upvotes),
            downvotes: parseInt(comment.downvotes),
            childrenIds: JSON.parse(comment.childrenIds)
        }));
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    if (commentArr.length) renderComments();

    document.getElementById("add-comment").addEventListener("click", () => {
        let name = document.getElementById("name").value.trim();
        let handle = document.getElementById("handle").value.trim();
        let content = document.getElementById("comment").value.trim();

        if (!name || !handle || !content) {
            alert("All fields are required!");
            return;
        }

        addComment(name, handle, content, null);
        document.getElementById("name").value = "";
        document.getElementById("handle").value = "";
        document.getElementById("comment").value = "";
    });

    document.getElementById("commentsList").addEventListener("click", event => {
        let target = event.target;
        let parts = target.id.split("-");
        let type = parts[0];
        let id = parts[1];

        if (type === "reply") {
            showReplyInput(id);
        } else if (type === "addreply") {
            let replyContent = document.getElementById(`content-${id}`).value.trim();
            let replyName = document.getElementById(`name-${id}`).value.trim();
            let replyHandle = document.getElementById(`handle-${id}`).value.trim();

            if (!replyName || !replyHandle || !replyContent) {
                alert("All fields are required!");
                return;
            }

            addComment(replyName, replyHandle, replyContent, id);
        } else if (type === "delete") {
            if (confirm("Are you sure you want to delete this comment?")) {
                deleteComment(id);
            }
        }
    });
});


function showReplyInput(parentId) {
    let inputElem = `
        <li id="input-${parentId}">
            <div class="comment-input-row">
                <input type="text" placeholder="Name" id="name-${parentId}" class="name-handle" />
                <input type="text" placeholder="Handle" id="handle-${parentId}" class="name-handle" />
            </div>
            <textarea rows="3" id="content-${parentId}" class="comment-box" placeholder="Your reply..."></textarea>
            <button id="addreply-${parentId}" class="add-btn">Submit</button>
        </li>
    `;

    let parentElem = document.getElementById(`comment-${parentId}`);
    let childListElem = document.getElementById(`childlist-${parentId}`);

    if (!childListElem) {
        parentElem.innerHTML += `<ul id="childlist-${parentId}">${inputElem}</ul>`;
    } else {
        childListElem.innerHTML = inputElem + childListElem.innerHTML;
    }
}


function storeComments() {
    localStorage.setItem("commentArr", JSON.stringify(commentArr));
}


function renderComments() {
    let rootComments = commentArr.filter(comment => comment.parentId === null);
    document.getElementById("commentsList").innerHTML = rootComments.map(renderComment).join("");
}

function renderComment(comment) {
    let id = comment.id;
    let childComments = comment.childrenIds.map(childId => renderComment(commentArr[childId])).join("");

    return `
        <div class="hr"><hr/></div>
        <li id="comment-${id}" class="comment">
            <div class="comment-header">
                <div class="comment-handle">${comment.handle}</div>
                <div class="comment-time">posted ${timeAgo(comment.lastUpdated)}</div>
            </div>
            <p class="comment-text">${comment.content}</p>
            <div class="comment-actions">
                <button id="reply-${id}" class="reply-btn">Reply</button>
                <button id="delete-${id}" class="delete-btn">Delete</button>
            </div>
            <ul id="childlist-${id}">${childComments}</ul>
        </li>
    `;
}


function addComment(name, handle, content, parentId) {
    let newComment = {
        id: commentArr.length,
        name,
        handle,
        content,
        lastUpdated: new Date(),
        upvotes: 0,
        downvotes: 0,
        childrenIds: [],
        parentId
    };

    commentArr.push(newComment);

    if (parentId !== null) {
        commentArr[parentId].childrenIds.push(newComment.id);
    }

    storeComments();
    renderComments();
}


function deleteComment(id) {
    let index = commentArr.findIndex(comment => comment.id == id);
    if (index !== -1) {
        commentArr.splice(index, 1);
        storeComments();
        renderComments();
    }
}


function timeAgo(date) {
    let diff = (new Date() - date) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

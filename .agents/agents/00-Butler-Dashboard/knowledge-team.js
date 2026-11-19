(function () {
  'use strict';

  const articleType = document.getElementById('knowledge-article-type');
  const productInput = document.getElementById('knowledge-product');
  const messageInput = document.getElementById('room-message');
  const taskButtons = document.querySelectorAll('[data-knowledge-task]');

  const taskBriefs = {
    author: type => `AUTHOR TASK — Draft a customer-facing ${type} knowledge article using the assigned template and source facts only. Use customer voice (“you”), sentence-style capitalization, and a title under 60 characters. Include the required SEO description, Applies to and Meta fields; use official product and version names, code tags for technical strings, and no customer or confidential data. For Defect articles, use the predefined ServiceNow template unchanged, never leave Workaround blank (write “None” if none exists), keep tracking IDs out of public fields, and use the approved Problem Resolution wording for the defect status. Ask for missing facts instead of inventing details.\n\nProduct/version: ${getProduct()}\n\nSource facts and requested outcome:\n[Add facts here]`,
    reviewer: type => `REVIEWER TASK — Review this ${type} article for technical accuracy, correct template, clarity, completeness, customer voice, title and SEO requirements, official product/version formatting, privacy, links, and screenshots. For Defect articles, verify that Workaround is filled and Problem Resolution matches the defect status. Return an explicit approve or reject decision. If rejecting, explain every issue with actionable detail and return the article to draft. Do not invent missing facts.\n\nProduct/version: ${getProduct()}\n\nDraft and supporting facts:\n[Add or paste sanitized content here]`,
    publisher: type => `PUBLISHER TASK — Perform the final customer-facing review of this ${type} article. Verify the Knowledge Base and Category, required fields, SEO, title, Applies to, official product naming, customer voice, privacy, valid links, and screenshot quality. For Defect articles, verify the template, Workaround, defect status wording, and that internal tracking IDs are excluded from public fields. Approve public release only when the article is complete and clear. Otherwise reject it to draft with detailed reasons. Do not publish confidential or unverified information.\n\nProduct/version: ${getProduct()}\n\nReviewed article:\n[Add or paste sanitized content here]`
  };

  function getProduct() {
    return productInput.value.trim() || '[official product name and version]';
  }

  taskButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskType = button.getAttribute('data-knowledge-task');
      const buildBrief = taskBriefs[taskType];
      if (!buildBrief) return;

      messageInput.value = buildBrief(articleType.value);
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));
      messageInput.focus();
    });
  });
})();

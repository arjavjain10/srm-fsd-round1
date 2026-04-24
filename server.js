const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const USER_ID = "arjavjain_10032006";
const EMAIL_ID = "aj8157@srmist.edu.in";
const COLLEGE_ROLL = "RA2311003010527";

function isValidEdge(entry) {
  if (typeof entry !== "string") return false;
  let trimmed = entry.trim();
  if (trimmed.length === 0) return false;
  let parts = trimmed.split("->");
  if (parts.length !== 2) return false;
  let parent = parts[0];
  let child = parts[1];
  if (parent.length !== 1 || child.length !== 1) return false;
  if (!/^[A-Z]$/.test(parent) || !/^[A-Z]$/.test(child)) return false;
  if (parent === child) return false;
  return true;
}

function processData(data) {
  let invalidEntries = [];
  let validEdges = [];
  let duplicateEdgesSet = new Set();
  let seenEdges = new Set();

  for (let entry of data) {
    let trimmed = typeof entry === "string" ? entry.trim() : String(entry);
    if (!isValidEdge(entry)) {
      invalidEntries.push(trimmed);
      continue;
    }
    let normalized = trimmed.trim();
    if (seenEdges.has(normalized)) {
      duplicateEdgesSet.add(normalized);
    } else {
      seenEdges.add(normalized);
      validEdges.push(normalized);
    }
  }

  let childToParent = {};
  let parentToChildren = {};
  let allNodes = new Set();

  for (let edge of validEdges) {
    let parts = edge.split("->");
    let parent = parts[0];
    let child = parts[1];
    allNodes.add(parent);
    allNodes.add(child);
    if (!(child in childToParent)) {
      childToParent[child] = parent;
      if (!parentToChildren[parent]) parentToChildren[parent] = [];
      parentToChildren[parent].push(child);
    }
  }

  let visited = new Set();
  let groups = [];

  for (let node of allNodes) {
    if (!visited.has(node)) {
      let group = new Set();
      let queue = [node];
      while (queue.length > 0) {
        let current = queue.shift();
        if (group.has(current)) continue;
        group.add(current);
        visited.add(current);
        if (parentToChildren[current]) {
          for (let c of parentToChildren[current]) {
            if (!group.has(c)) queue.push(c);
          }
        }
        if (childToParent[current] && !group.has(childToParent[current])) {
          queue.push(childToParent[current]);
        }
      }
      groups.push(group);
    }
  }

  let hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let largestDepth = 0;
  let largestTreeRoot = null;

  for (let group of groups) {
    let childSet = new Set();
    for (let node of group) {
      if (childToParent[node] && group.has(childToParent[node])) {
        childSet.add(node);
      }
    }

    let roots = [];
    for (let node of group) {
      if (!childSet.has(node)) roots.push(node);
    }

    if (roots.length === 0) {
      let sorted = Array.from(group).sort();
      roots = [sorted[0]];
    }

    let root = roots.sort()[0];

    let hasCycle = detectCycle(root, parentToChildren, group);

    if (hasCycle) {
      totalCycles++;
      hierarchies.push({
        root: root,
        tree: {},
        has_cycle: true
      });
    } else {
      let treeOutput = buildTree(root, parentToChildren);
      let tree = {};
      tree[root] = treeOutput;
      let depth = calculateDepth(root, parentToChildren);
      totalTrees++;
      let entry = {
        root: root,
        tree: tree,
        depth: depth
      };
      hierarchies.push(entry);
      if (depth > largestDepth || (depth === largestDepth && (largestTreeRoot === null || root < largestTreeRoot))) {
        largestDepth = depth;
        largestTreeRoot = root;
      }
    }
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL,
    hierarchies: hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: Array.from(duplicateEdgesSet),
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot || ""
    }
  };
}

function detectCycle(start, parentToChildren, group) {
  let visited = new Set();
  let stack = [start];
  let recStack = new Set();

  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    if (parentToChildren[node]) {
      for (let child of parentToChildren[node]) {
        if (!group.has(child)) continue;
        if (!visited.has(child)) {
          if (dfs(child)) return true;
        } else if (recStack.has(child)) {
          return true;
        }
      }
    }
    recStack.delete(node);
    return false;
  }

  for (let node of group) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }
  return false;
}

function buildTree(node, parentToChildren) {
  let result = {};
  if (parentToChildren[node]) {
    for (let child of parentToChildren[node]) {
      result[child] = buildTree(child, parentToChildren);
    }
  }
  return result;
}

function calculateDepth(node, parentToChildren) {
  if (!parentToChildren[node] || parentToChildren[node].length === 0) {
    return 1;
  }
  let maxChildDepth = 0;
  for (let child of parentToChildren[node]) {
    let d = calculateDepth(child, parentToChildren);
    if (d > maxChildDepth) maxChildDepth = d;
  }
  return 1 + maxChildDepth;
}

app.post("/bfhl", (req, res) => {
  try {
    let data = req.body.data;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "data must be an array" });
    }
    let result = processData(data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

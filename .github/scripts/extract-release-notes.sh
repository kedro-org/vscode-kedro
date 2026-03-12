#!/bin/bash

# Get version from argument
VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Error: Version number required"
  exit 1
fi

echo "Extracting release notes for version $VERSION"

# Extract the section for the current version
awk -v ver="# $VERSION" '
  $0 ~ ver {flag=1; next}
  /^# [0-9]/ {if (flag) flag=0}
  flag {print}
' CHANGELOG.md > release_notes.txt

# Check if anything was extracted
if [ ! -s release_notes.txt ]; then
  echo "Warning: No release notes found for version $VERSION in CHANGELOG.md"
  echo "Please check the CHANGELOG.md file for the correct version format."
  echo "Release created with default message." > release_notes.txt
fi
sign-off:
	echo "git interpret-trailers --if-exists doNothing \c" >> .git/hooks/commit-msg
	echo '--trailer "Signed-off-by: $$(git config user.name) <$$(git config user.email)>" \c' >> .git/hooks/commit-msg
	echo '--in-place "$$1"' >> .git/hooks/commit-msg
	chmod +x .git/hooks/commit-msg


build:
	vsce package


dev-install:
	npm install
	pip install uv
	uv pip install --system -r dev-requirements.txt
	nox --session build_package

test:
	pytest
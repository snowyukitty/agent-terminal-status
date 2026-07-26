from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


statusline = load_module("ats_statusline", ROOT / "src" / "statusline.py")
manager = load_module("ats_manager", ROOT / "scripts" / "manage.py")


class StatusLineTests(unittest.TestCase):
    def base_env(self, **overrides: str) -> dict[str, str]:
        environment = dict(os.environ)
        environment.update(
            {
                "HOME": "/home/alex",
                "USERPROFILE": r"C:\Users\alex",
                "ATS_MACHINE": "build-box",
                "COLUMNS": "96",
            }
        )
        environment.update(overrides)
        return environment

    def test_workspace_current_dir_wins(self) -> None:
        payload = json.dumps(
            {
                "cwd": "/stale",
                "workspace": {"current_dir": "/current", "project_dir": "/started"},
            }
        )
        _, cwd = statusline.parse_payload(payload, "/fallback")
        self.assertEqual(cwd, "/current")

    def test_malformed_payload_falls_back(self) -> None:
        _, cwd = statusline.parse_payload("{not-json", "/safe/fallback")
        self.assertEqual(cwd, "/safe/fallback")

    def test_context_path_preserves_repo_and_nested_directory(self) -> None:
        git = statusline.GitIdentity(r"C:\Users\alex\work\sample repo", "main")
        value = statusline.display_path(
            r"C:\Users\alex\work\sample repo\packages\日本語",
            git,
            env=self.base_env(),
        )
        self.assertEqual(value, "sample repo/packages/日本語")

    def test_non_git_path_is_home_relative(self) -> None:
        value = statusline.display_path(
            r"C:\Users\alex\scratch\notes",
            None,
            env=self.base_env(),
        )
        self.assertEqual(value, "~/scratch/notes")

    def test_full_and_name_path_styles(self) -> None:
        git = statusline.GitIdentity("/home/alex/work/repo", "main")
        env = self.base_env()
        self.assertEqual(
            statusline.display_path("/home/alex/work/repo/src/api", git, "full", env),
            "~/work/repo/src/api",
        )
        self.assertEqual(
            statusline.display_path("/home/alex/work/repo/src/api", git, "name", env),
            "api",
        )

    def test_wide_render_includes_all_identity(self) -> None:
        identity = statusline.StatusIdentity(
            cwd="/work/project/docs",
            path="project/docs",
            branch="feature/status",
            machine="build-box",
        )
        rendered = statusline.render(identity, self.base_env())
        self.assertEqual(rendered, "project/docs · feature/status · build-box")

    def test_narrow_render_keeps_path_and_drops_branch_first(self) -> None:
        identity = statusline.StatusIdentity(
            cwd="/work/project/packages/very-long-service",
            path="project/packages/very-long-service",
            branch="feature/very-long-branch",
            machine="build-box",
        )
        rendered = statusline.render(identity, self.base_env(COLUMNS="32"))
        self.assertLessEqual(len(rendered), 32)
        self.assertNotIn("feature/", rendered)
        self.assertIn("build-box", rendered)
        self.assertTrue(rendered.startswith("project"))
        self.assertTrue("service" in rendered)

    def test_very_narrow_render_is_path_only(self) -> None:
        identity = statusline.StatusIdentity(
            cwd="/work/project/packages/very-long-service",
            path="project/packages/very-long-service",
            branch="feature/status",
            machine="build-box",
        )
        rendered = statusline.render(identity, self.base_env(COLUMNS="20"))
        self.assertLessEqual(len(rendered), 20)
        self.assertNotIn("feature", rendered)
        self.assertNotIn("build-box", rendered)
        self.assertIn("service", rendered)

    def test_narrow_render_counts_wide_unicode_cells(self) -> None:
        identity = statusline.StatusIdentity(
            cwd="/work/project/packages/日本語-service",
            path="project/packages/日本語-service",
            branch="main",
            machine="build-box",
        )
        rendered = statusline.render(identity, self.base_env(COLUMNS="26"))
        self.assertLessEqual(statusline.display_width(rendered), 26)
        self.assertIn("service", rendered)

    def test_ascii_and_visibility_overrides(self) -> None:
        identity = statusline.StatusIdentity("/work/repo", "repo", "main", "build-box")
        rendered = statusline.render(
            identity,
            self.base_env(ATS_ASCII="1", ATS_SHOW_BRANCH="never", ATS_SHOW_HOST="always"),
        )
        self.assertEqual(rendered, "repo | build-box")

    def test_missing_git_is_a_clean_fallback(self) -> None:
        environment = self.base_env(PATH="")
        self.assertIsNone(statusline.collect_git("/work/repo", environment))

    def test_git_repo_branch_detached_head_and_worktree(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ats git 日本語 ") as temporary:
            repo = Path(temporary) / "repo with spaces"
            repo.mkdir()
            self.git(repo, "init")
            self.git(repo, "config", "user.email", "test@example.invalid")
            self.git(repo, "config", "user.name", "Test User")
            (repo / "file.txt").write_text("first\n", encoding="utf-8")
            self.git(repo, "add", "file.txt")
            self.git(repo, "commit", "-m", "initial")
            self.git(repo, "branch", "-M", "main")
            nested = repo / "packages" / "日本語"
            nested.mkdir(parents=True)

            identity = statusline.collect_git(str(nested), self.base_env())
            self.assertIsNotNone(identity)
            assert identity is not None
            self.assertEqual(Path(identity.root).resolve(), repo.resolve())
            self.assertEqual(identity.branch, "main")

            self.git(repo, "checkout", "--detach", "HEAD")
            detached = statusline.collect_git(str(nested), self.base_env())
            self.assertIsNotNone(detached)
            assert detached is not None
            self.assertRegex(detached.branch or "", r"^detached@[0-9a-f]{7}$")

            self.git(repo, "switch", "main")
            worktree = Path(temporary) / "linked worktree"
            self.git(repo, "worktree", "add", "-b", "feature/worktree", str(worktree))
            worktree_identity = statusline.collect_git(str(worktree), self.base_env())
            self.assertIsNotNone(worktree_identity)
            assert worktree_identity is not None
            self.assertEqual(Path(worktree_identity.root).resolve(), worktree.resolve())
            self.assertEqual(worktree_identity.branch, "feature/worktree")

    def test_cli_handles_unicode_utf8_and_invalid_json(self) -> None:
        environment = self.base_env(ATS_SHOW_BRANCH="never")
        result = subprocess.run(
            [sys.executable, str(ROOT / "src" / "statusline.py")],
            input=json.dumps(
                {"workspace": {"current_dir": "/home/alex/專案/agent-terminal-status"}},
                ensure_ascii=False,
            ),
            text=True,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=environment,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("專案", result.stdout)
        self.assertIn("·", result.stdout)

        invalid = subprocess.run(
            [sys.executable, str(ROOT / "src" / "statusline.py")],
            input="{broken",
            text=True,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=environment,
            check=False,
        )
        self.assertEqual(invalid.returncode, 0)
        self.assertTrue(invalid.stdout.strip())

    @staticmethod
    def git(cwd: Path, *arguments: str) -> None:
        subprocess.run(
            ["git", "-C", str(cwd), *arguments],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )


class InstallerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="ats installer ")
        self.config = Path(self.temporary.name) / "claude config"
        self.config.mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_settings(self, value: dict) -> None:
        (self.config / "settings.json").write_text(
            json.dumps(value, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def read_settings(self) -> dict:
        return json.loads((self.config / "settings.json").read_text(encoding="utf-8"))

    def test_install_and_uninstall_preserve_unrelated_settings(self) -> None:
        self.write_settings({"theme": "dark", "env": {"EXAMPLE": "日本語"}})
        manager.install(self.config)
        installed = self.read_settings()
        self.assertEqual(installed["theme"], "dark")
        self.assertIn("/agent-terminal-status/statusline.py", installed["statusLine"]["command"])
        self.assertTrue((self.config / "agent-terminal-status" / "uninstall.sh").exists())

        manager.uninstall(self.config)
        restored = self.read_settings()
        self.assertEqual(restored, {"theme": "dark", "env": {"EXAMPLE": "日本語"}})
        self.assertFalse((self.config / "agent-terminal-status").exists())

    def test_existing_statusline_requires_force_then_restores(self) -> None:
        previous = {"type": "command", "command": "old-status", "padding": 3}
        self.write_settings({"statusLine": previous, "verbose": True})
        with self.assertRaisesRegex(RuntimeError, "--force"):
            manager.install(self.config)
        self.assertEqual(self.read_settings()["statusLine"], previous)

        manager.install(self.config, force=True)
        manager.install(self.config, force=True)
        manager.uninstall(self.config)
        restored = self.read_settings()
        self.assertEqual(restored["statusLine"], previous)
        self.assertTrue(restored["verbose"])

    def test_uninstall_does_not_overwrite_later_user_change(self) -> None:
        self.write_settings({"theme": "dark"})
        manager.install(self.config)
        settings = self.read_settings()
        settings["statusLine"] = {"type": "command", "command": "new-user-command"}
        self.write_settings(settings)

        manager.uninstall(self.config)
        self.assertEqual(self.read_settings()["statusLine"]["command"], "new-user-command")

    def test_invalid_settings_are_not_touched(self) -> None:
        settings_path = self.config / "settings.json"
        settings_path.write_text("{ invalid", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "invalid JSON"):
            manager.install(self.config)
        self.assertEqual(settings_path.read_text(encoding="utf-8"), "{ invalid")
        self.assertFalse((self.config / "agent-terminal-status").exists())

    def test_unknown_install_file_is_kept(self) -> None:
        self.write_settings({})
        manager.install(self.config)
        unknown = self.config / "agent-terminal-status" / "my-config.txt"
        unknown.write_text("keep", encoding="utf-8")
        manager.uninstall(self.config)
        self.assertTrue(unknown.exists())


if __name__ == "__main__":
    unittest.main()

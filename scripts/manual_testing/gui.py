"""Native ttk execution interface. No network or player control."""
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from .model import (STATUSES, DISPLAY_STATUSES, ENV_FIELDS, new_session, filtered_tests,
                    progress, test_status, definition_changes, detect_runner_environment,
                    prepare_for_runner, use_current_machine, copy_checkout_revision)
from .storage import (save_session, load_session, file_sha256, application_state_directory,
                      remember_session, resume_session_path)
from .exporter import WARNING, failure_report, export_session


class Runner:
    def __init__(self, window, root, catalog, session_path=None):
        self.window, self.root, self.current_catalog = window, root, catalog
        self.state_directory = application_state_directory()
        self.directory = self.state_directory / 'sessions'
        self.runner_environment = detect_runner_environment(root)
        self.path = None
        self.session = None
        self.current = None
        self.editing = False
        self.pending = None
        self.dirty = False
        self.window.title('Pear manual acceptance — offline')
        self.window.geometry('1180x850')
        self.window.minsize(760, 600)
        self.build()
        for shortcut, callback in [('<Control-s>', self.save), ('<Control-o>', self.open),
                                   ('<Control-n>', self.new), ('<Control-f>', self.focus_search),
                                   ('<Alt-Right>', lambda: self.navigate(1)),
                                   ('<Alt-Left>', lambda: self.navigate(-1)),
                                   ('<Alt-Down>', self.next_not_run)]:
            self.window.bind(shortcut, lambda event, cb=callback: (cb(), 'break')[1])
        self.window.protocol('WM_DELETE_WINDOW', self.close)
        if session_path:
            self.load(session_path)
        else:
            try:
                previous = resume_session_path(self.state_directory)
                if previous is not None:
                    self.load(previous)
            except (OSError, ValueError) as error:
                messagebox.showwarning('Cannot resume session', str(error), parent=window)
            if self.session is None:
                self.new()

    def build(self):
        self.window.columnconfigure(0, weight=1)
        self.window.rowconfigure(3, weight=1)
        toolbar = ttk.Frame(self.window, padding=6)
        toolbar.grid(row=0, column=0, sticky='ew')
        for button_index, (label, callback) in enumerate([('New', self.new), ('Open', self.open), ('Save', self.save),
                                ('Test / Runner Environment', self.environment), ('Export Markdown', self.export),
                                ('Copy Failure Report', self.copy_report), ('Help', self.help)]):
            toolbar.columnconfigure(button_index % 4, weight=1)
            ttk.Button(toolbar, text=label, command=callback, padding=5).grid(
                row=button_index // 4, column=button_index % 4, sticky='ew', padx=2, pady=2)
        ttk.Label(self.window, text=WARNING, wraplength=1050, padding=6).grid(row=1, column=0, sticky='ew')
        self.header = tk.StringVar()
        ttk.Label(self.window, textvariable=self.header, wraplength=1050, padding=6).grid(row=2, column=0, sticky='ew')
        panes = ttk.Panedwindow(self.window, orient='horizontal')
        panes.grid(row=3, column=0, sticky='nsew', padx=6)
        left, right = ttk.Frame(panes), ttk.Frame(panes)
        panes.add(left, weight=1)
        panes.add(right, weight=3)
        left.columnconfigure(0, weight=1)
        left.rowconfigure(6, weight=1)
        self.search = tk.StringVar()
        ttk.Label(left, text='Search / test ID (Ctrl+F)').grid(row=0, sticky='w')
        self.search_entry = ttk.Entry(left, textvariable=self.search)
        self.search_entry.grid(row=1, sticky='ew')
        self.suite = tk.StringVar()
        self.suite_box = ttk.Combobox(left, textvariable=self.suite, state='readonly')
        ttk.Label(left, text='Suite / plan').grid(row=2, sticky='w')
        self.suite_box.grid(row=3, sticky='ew')
        filters = ttk.Frame(left)
        filters.grid(row=4, sticky='ew')
        self.status_filter, self.platform_filter, self.tag_filter = (tk.StringVar(value='All') for _ in range(3))
        for col, (label, var, values) in enumerate([
                ('Status', self.status_filter, ['All', *DISPLAY_STATUSES]),
                ('Platform', self.platform_filter, ['All']), ('Tag', self.tag_filter, ['All'])]):
            filters.columnconfigure(col, weight=1)
            ttk.Label(filters, text=label).grid(row=0, column=col, sticky='w')
            box = ttk.Combobox(filters, textvariable=var, values=values, state='readonly', width=12)
            box.grid(row=1, column=col, sticky='ew')
            if label == 'Platform': self.platform_box = box
            if label == 'Tag': self.tag_box = box
        ttk.Label(left, text='ID / current session result').grid(row=5, sticky='w', pady=(8, 0))
        self.tree = ttk.Treeview(left, columns=('title', 'status'), show='tree headings', selectmode='browse')
        self.tree.heading('#0', text='ID')
        self.tree.column('#0', width=52, stretch=False)
        self.tree.heading('title', text='Test')
        self.tree.column('title', width=135)
        self.tree.heading('status', text='Status')
        self.tree.column('status', width=90)
        self.tree.grid(row=6, sticky='nsew')
        scroll = ttk.Scrollbar(left, orient='vertical', command=self.tree.yview)
        scroll.grid(row=6, column=1, sticky='ns')
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.bind('<<TreeviewSelect>>', self.select_test)
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=3)
        right.rowconfigure(6, weight=1)
        self.title = tk.StringVar()
        ttk.Label(right, textvariable=self.title, padding=6, wraplength=750).grid(row=0, sticky='ew')
        self.instructions = self.text_area(right, 1, height=12, readonly=True)
        self.aggregate_label = tk.StringVar()
        ttk.Label(right, textvariable=self.aggregate_label, padding=4).grid(row=2, sticky='ew')
        self.scenario = tk.StringVar()
        self.scenario_box = ttk.Combobox(right, textvariable=self.scenario, state='readonly')
        self.scenario_box.grid(row=3, sticky='ew', pady=3)
        self.scenario_box.bind('<<ComboboxSelected>>', self.select_scenario)
        self.scenario_status = tk.StringVar()
        ttk.Label(right, textvariable=self.scenario_status, wraplength=730).grid(row=4, sticky='ew')
        status_bar = ttk.Frame(right)
        status_bar.grid(row=5, sticky='ew')
        for index, status in enumerate(STATUSES):
            status_bar.columnconfigure(index % 3, weight=1)
            ttk.Button(status_bar, text=status, command=lambda s=status: self.mark(s), padding=5).grid(
                row=index // 3, column=index % 3, sticky='ew', padx=2, pady=2)
        notebook = ttk.Notebook(right)
        notebook.grid(row=6, sticky='nsew', pady=5)
        actual_frame, evidence_frame = ttk.Frame(notebook), ttk.Frame(notebook)
        notebook.add(actual_frame, text='Actual result / notes')
        notebook.add(evidence_frame, text='Evidence / paths / references')
        for frame in (actual_frame, evidence_frame):
            frame.columnconfigure(0, weight=1)
            frame.rowconfigure(0, weight=1)
        self.actual = self.text_area(actual_frame, 0, height=5)
        self.evidence = self.text_area(evidence_frame, 0, height=5)
        ttk.Button(evidence_frame, text='Insert local file path (no copy)', command=self.add_evidence).grid(row=1, sticky='w')
        for widget in (self.actual, self.evidence):
            widget.bind('<<Modified>>', self.notes_changed)
        self.note_target = None
        footer = ttk.Frame(self.window, padding=6)
        footer.grid(row=4, sticky='ew')
        for label, callback in [('Previous (Alt+Left)', lambda: self.navigate(-1)),
                                ('Next (Alt+Right)', lambda: self.navigate(1)),
                                ('Next Not Run (Alt+Down)', self.next_not_run)]:
            ttk.Button(footer, text=label, command=callback, padding=5).pack(side='left', padx=2)
        self.progress_label = tk.StringVar()
        ttk.Label(self.window, textvariable=self.progress_label, wraplength=1100, padding=6).grid(row=5, sticky='ew')
        self.save_label = tk.StringVar()
        ttk.Label(self.window, textvariable=self.save_label, wraplength=1100, padding=6).grid(row=6, sticky='ew')
        for var in (self.search, self.status_filter, self.platform_filter, self.tag_filter):
            var.trace_add('write', lambda *_: self.filter_changed())
        self.suite_box.bind('<<ComboboxSelected>>', self.suite_changed)

    def text_area(self, parent, row, height, readonly=False):
        frame = ttk.Frame(parent)
        frame.grid(row=row, column=0, sticky='nsew')
        frame.rowconfigure(0, weight=1)
        frame.columnconfigure(0, weight=1)
        widget = tk.Text(frame, wrap='word', height=height, width=30, undo=not readonly,
                         font='TkDefaultFont', padx=5, pady=5)
        widget.grid(row=0, column=0, sticky='nsew')
        scroll = ttk.Scrollbar(frame, command=widget.yview)
        scroll.grid(row=0, column=1, sticky='ns')
        widget.configure(yscrollcommand=scroll.set)
        # Tab/Shift+Tab move focus; notes don't trap keyboard navigation.
        widget.bind('<Tab>', lambda event: (event.widget.tk_focusNext().focus_set(), 'break')[1])
        widget.bind('<Shift-Tab>', lambda event: (event.widget.tk_focusPrev().focus_set(), 'break')[1])
        widget.bind('<ISO_Left_Tab>', lambda event: (event.widget.tk_focusPrev().focus_set(), 'break')[1])
        if readonly: widget.configure(state='disabled')
        return widget

    def set_text(self, widget, text, readonly=False):
        widget.configure(state='normal')
        widget.delete('1.0', 'end')
        widget.insert('1.0', text)
        widget.edit_modified(False)
        widget.edit_reset()
        if readonly: widget.configure(state='disabled')

    def flush_notes(self):
        if self.note_target is not None and not self.editing:
            self.note_target['actual'] = self.actual.get('1.0', 'end-1c')
            self.note_target['evidence'] = self.evidence.get('1.0', 'end-1c')

    def notes_changed(self, event):
        widget = event.widget
        if widget.edit_modified():
            widget.edit_modified(False)
            if not self.editing and self.note_target is not None:
                self.flush_notes()
                self.changed()

    def changed(self):
        self.dirty = True
        self.save_label.set('Unsaved changes — autosaving…')
        if self.pending is not None: self.window.after_cancel(self.pending)
        self.pending = self.window.after(350, self.autosave)

    def autosave(self):
        self.pending = None
        self.save(show_error=False)

    def save(self, show_error=True):
        if self.session is None: return True
        self.flush_notes()
        try:
            save_session(self.path, self.session)
            self.dirty = False
            self.save_label.set(f'Saved {datetime.now().strftime("%H:%M:%S")} — {self.path}')
            return True
        except (OSError, ValueError) as error:
            self.dirty = True
            self.save_label.set(f'SAVE FAILED — {error}. Ctrl+S to retry; keep this window open.')
            if show_error: messagebox.showerror('Session not saved', str(error), parent=self.window)
            return False

    def safe_leave(self):
        if self.save(): return True
        return messagebox.askyesno('Unsaved session', 'Saving failed. Discard unsaved changes anyway?', parent=self.window)

    def new(self):
        if self.window.grab_current() is not None: return
        if not self.safe_leave(): return
        self.install(new_session(self.current_catalog, runner=self.runner_environment), None)

    def open(self):
        if self.window.grab_current() is not None: return
        if not self.safe_leave(): return
        filename = filedialog.askopenfilename(parent=self.window, initialdir=self.directory,
                                              filetypes=[('JSON sessions', '*.json')])
        if filename:
            try: self.load(Path(filename))
            except (OSError, ValueError) as error:
                messagebox.showerror('Cannot open session', str(error), parent=self.window)

    def load(self, path):
        session = load_session(path)
        self.install(session, Path(path))
        changes = definition_changes(session, self.current_catalog)
        if changes['changed']:
            messagebox.showinfo('Saved definitions retained',
                'This session uses its saved catalog snapshot. Current definitions differ; results were not migrated. '
                f'Orphaned IDs relative to current catalog: {changes["orphaned"] or "none"}. '
                f'New IDs: {changes["added"] or "none"}. Start a new session to use current definitions.', parent=self.window)

    def install(self, session, path):
        session, provenance_warning = prepare_for_runner(session, self.runner_environment)
        self.editing = True
        if self.pending is not None:
            self.window.after_cancel(self.pending)
            self.pending = None
        self.note_target = None
        self.session = session
        self.path = path or self.directory / f'{datetime.now():%Y-%m-%d}-{session["session_id"]}.json'
        self.current = session['selected_test']
        catalog = session['catalog_snapshot']
        self.suite_names = {s['name']: s['id'] for s in catalog['suites']}
        self.suite_box['values'] = list(self.suite_names)
        self.suite.set(next(s['name'] for s in catalog['suites'] if s['id'] == session['suite_id']))
        self.platform_box['values'] = ['All', *sorted({p for t in catalog['tests'] for p in t['platforms']})]
        self.tag_box['values'] = ['All', *sorted({p for t in catalog['tests'] for p in t['tags']})]
        for var in (self.search, self.status_filter, self.platform_filter, self.tag_filter):
            var.set('' if var is self.search else 'All')
        self.editing = False
        self.refresh()
        self.show_test(self.current)
        if self.save():
            try: remember_session(self.state_directory, self.path)
            except OSError as error: self.save_label.set(f'Session saved; local resume pointer failed: {error}')
        if provenance_warning:
            messagebox.showwarning('Review Test Environment', provenance_warning, parent=self.window)

    def visible(self):
        return filtered_tests(self.session, self.search.get(), self.status_filter.get(),
                              self.platform_filter.get(), self.tag_filter.get())

    def filter_changed(self):
        if self.session is not None and not self.editing:
            self.flush_notes()
            self.refresh()

    def suite_changed(self, event=None):
        self.flush_notes()
        self.session['suite_id'] = self.suite_names[self.suite.get()]
        self.refresh()
        if self.visible(): self.show_test(self.visible()[0]['id'])
        self.changed()

    def refresh(self):
        tests = self.visible()
        self.tree.delete(*self.tree.get_children())
        for test in tests:
            self.tree.insert('', 'end', iid=test['id'], text=test['id'],
                             values=(test['title'], test_status(self.session, test['id'])))
        if self.current in self.tree.get_children():
            self.tree.selection_set(self.current)
            self.tree.see(self.current)
        counts, scenarios = progress(self.session, tests)
        executed = sum(scenarios[s] for s in ('Pass', 'Fail', 'Blocked'))
        test_executed = sum(any(r['status'] in ('Pass', 'Fail', 'Blocked')
                                for r in self.session['results'][t['id']]['scenarios'].values()) for t in tests)
        self.progress_label.set(f'Filtered tests: {test_executed}/{len(tests)} with execution; '
            + ' | '.join(f'{s}: {counts[s]}' for s in DISPLAY_STATUSES)
            + f'\nScenarios: {executed}/{sum(scenarios.values())} executed; '
            + ' | '.join(f'{s}: {scenarios[s]}' for s in STATUSES))
        env = self.session['environment']
        self.header.set(f'Test Environment: {env.get("session_name", "")} | {env.get("tester", "")} | '
                        f'{env.get("os_product", "")} | {env.get("host_application", "")} {env.get("host_version", "")}\n'
                        f'Installed plugin {env.get("plugin_commit", "")} | Pear {env.get("pear_commit", "")}\n'
                        f'Runner Environment: {self.runner_environment["os_product"]} | Python {self.runner_environment["python_version"]} | '
                        f'checkout {self.runner_environment["checkout_branch"]} {self.runner_environment["checkout_head"]}')

    def select_test(self, event=None):
        selection = self.tree.selection()
        if selection and selection[0] != self.current:
            self.show_test(selection[0])

    def show_test(self, test_id):
        self.flush_notes()
        self.current = test_id
        self.session['selected_test'] = test_id
        test = next(t for t in self.session['catalog_snapshot']['tests'] if t['id'] == test_id)
        self.title.set(f'{test_id} — {test["title"]}')
        lines = ['Platforms: ' + ', '.join(test['platforms']), 'Platform notes: ' + test.get('platform_notes', ''),
                 'Tags: ' + ', '.join(test['tags']),
                 'Suites: ' + ', '.join(s['name'] for s in self.session['catalog_snapshot']['suites'] if test_id in s['tests']),
                 '', 'EXPECTED:', *test['expected'], '', 'STEPS:']
        lines += [f'{i}. {s}' for i, s in enumerate(test['steps'], 1)]
        lines += ['', 'PREREQUISITES:', *test['prerequisites'], '', 'PRIOR EVIDENCE (read-only; not this session):',
                  test['prior_evidence'] or 'No specific prior pass recorded. Not executed in this session until you record results.',
                  '', 'SHARED SETUP / LIMITATIONS:', *self.session['catalog_snapshot'].get('context', [])]
        self.set_text(self.instructions, '\n'.join(lines), True)
        self.scenario_names = {'Test-level notes (no status change)': None}
        for s in test['scenarios']:
            status = self.session['results'][test_id]['scenarios'][s['id']]['status']
            self.scenario_names[f'{s["id"]} [{status}] — {s["title"]}'] = s['id']
        # Preserve unexpected historical scenario results too.
        for sid in self.session['results'][test_id]['scenarios']:
            if sid not in self.scenario_names.values(): self.scenario_names[f'{sid} — Historical scenario'] = sid
        self.scenario_box['values'] = list(self.scenario_names)
        self.note_target = None
        self.scenario.set(list(self.scenario_names)[1])
        self.select_scenario()
        if test_id in self.tree.get_children():
            self.tree.selection_set(test_id)
            self.tree.see(test_id)
        self.changed()

    def select_scenario(self, event=None):
        self.flush_notes()
        sid = self.scenario_names[self.scenario.get()]
        result = self.session['results'][self.current]
        self.note_target = result if sid is None else result['scenarios'][sid]
        self.editing = True
        self.set_text(self.actual, self.note_target['actual'])
        self.set_text(self.evidence, self.note_target['evidence'])
        self.editing = False
        self.update_result_label()

    def update_result_label(self):
        self.aggregate_label.set('Current session test result: ' + test_status(self.session, self.current))
        self.scenario_status.set('Selected scenario: ' + self.note_target.get('status', 'Test-level notes only'))

    def mark(self, status):
        if self.note_target is None: return
        if 'status' not in self.note_target:
            messagebox.showinfo('Select a scenario', 'Choose a scenario above to record its status. Test-level notes do not change results.', parent=self.window)
            return
        self.flush_notes()
        self.note_target['status'] = status
        # Refresh only the selected dropdown label; keep focus and notes in place.
        sid = self.scenario_names[self.scenario.get()]
        label = self.scenario.get()
        replacement = f'{sid} [{status}] — ' + label.split(' — ', 1)[1]
        self.scenario_names = {replacement if key == label else key: value
                               for key, value in self.scenario_names.items()}
        self.scenario_box['values'] = list(self.scenario_names)
        self.scenario.set(replacement)
        self.update_result_label()
        self.refresh()
        self.changed()

    def navigate(self, delta):
        tests = [t['id'] for t in self.visible()]
        if not tests: return
        index = tests.index(self.current) if self.current in tests else (-1 if delta > 0 else len(tests))
        index = max(0, min(len(tests)-1, index+delta))
        self.show_test(tests[index])
        self.tree.focus(tests[index])
        self.tree.focus_set()

    def next_not_run(self):
        tests = [t['id'] for t in self.visible()]
        start = tests.index(self.current)+1 if self.current in tests else 0
        for tid in tests[start:]+tests[:start]:
            if test_status(self.session, tid) in ('Not Run', 'Partial'):
                self.show_test(tid)
                pending = next((sid for sid, row in self.session['results'][tid]['scenarios'].items()
                                if row['status'] == 'Not Run'), None)
                if pending:
                    self.scenario.set(next(label for label, sid in self.scenario_names.items() if sid == pending))
                    self.select_scenario()
                self.tree.focus(tid)
                self.tree.focus_set()
                return
        messagebox.showinfo('Next Not Run', 'No Not Run or Partial tests in the current filter.', parent=self.window)

    def focus_search(self):
        self.search_entry.focus_set()
        self.search_entry.selection_range(0, 'end')

    def add_evidence(self):
        filename = filedialog.askopenfilename(parent=self.window)
        if filename:
            self.evidence.insert('end', ('\n' if self.evidence.get('1.0', 'end-1c') else '') + filename)
            self.flush_notes()
            self.changed()

    def environment(self):
        dialog = tk.Toplevel(self.window)
        dialog.title('Test Environment (authoritative) / Runner Environment (diagnostic)')
        dialog.geometry('720x640')
        dialog.columnconfigure(0, weight=1)
        dialog.rowconfigure(0, weight=1)
        canvas = tk.Canvas(dialog, highlightthickness=0)
        canvas.grid(row=0, column=0, sticky='nsew')
        scroll = ttk.Scrollbar(dialog, command=canvas.yview)
        scroll.grid(row=0, column=1, sticky='ns')
        canvas.configure(yscrollcommand=scroll.set)
        frame = ttk.Frame(canvas, padding=10)
        item = canvas.create_window(0, 0, window=frame, anchor='nw')
        canvas.bind('<Configure>', lambda event: canvas.itemconfigure(item, width=event.width))
        frame.bind('<Configure>', lambda event: canvas.configure(scrollregion=canvas.bbox('all')))
        frame.columnconfigure(1, weight=1)
        runner_info = 'Runner Environment (diagnostic only):\n' + '\n'.join(
            f'{key.replace("_", " ")}: {value}' for key, value in self.runner_environment.items())
        ttk.Label(frame, text=runner_info, wraplength=630).grid(row=0, column=0, columnspan=2, sticky='ew')
        ttk.Label(frame, text='Test Environment — authoritative, editable; checkout is not installed-artifact proof.',
                  wraplength=630).grid(row=1, column=0, columnspan=2, sticky='ew', pady=8)
        variables = {}
        for row, field in enumerate(ENV_FIELDS, 2):
            ttk.Label(frame, text=field.replace('_', ' ').title()).grid(row=row, column=0, sticky='w', pady=4)
            var = tk.StringVar(value=self.session['environment'].get(field, ''))
            variables[field] = var
            entry = ttk.Entry(frame, textvariable=var)
            entry.grid(row=row, column=1, sticky='ew', padx=6, pady=4)
            def update(*_, key=field, value=var):
                self.session['environment'][key] = value.get()
                self.refresh()
                self.changed()
            var.trace_add('write', update)
            def reveal(event, widget=entry):
                dialog.update_idletasks()
                canvas.yview_moveto(max(0, widget.winfo_y()-40) / max(1, frame.winfo_height()))
            entry.bind('<FocusIn>', reveal)
        def hash_installer():
            filename = filedialog.askopenfilename(parent=dialog, title='Select plugin installer to hash locally')
            if filename:
                try:
                    variables['plugin_package_sha256'].set(file_sha256(filename))
                except OSError as error: messagebox.showerror('Cannot hash installer', str(error), parent=dialog)
        buttons = ttk.Frame(dialog, padding=6)
        buttons.grid(row=1, sticky='ew')
        def use_machine():
            use_current_machine(self.session, self.runner_environment)
            for field in ('os_product', 'os_build'):
                variables[field].set(self.session['environment'][field])
        def copy_revision():
            if messagebox.askyesno('Confirm installed artifact revision',
                    'Only copy if you know this checkout revision matches the installed plugin. Copy it?', parent=dialog):
                copy_checkout_revision(self.session, self.runner_environment)
                for field in ('plugin_branch', 'plugin_commit'):
                    variables[field].set(self.session['environment'][field])
        def reviewed():
            self.session['test_environment_review_required'] = False
            self.changed()
            self.save()
            dialog.destroy()
        ttk.Button(buttons, text='Use Current Machine as Test Environment', command=use_machine).grid(row=0, column=0, sticky='ew')
        ttk.Button(buttons, text='Copy checkout revision to installed plugin fields', command=copy_revision).grid(row=1, column=0, sticky='ew')
        ttk.Button(buttons, text='Hash installer locally…', command=hash_installer).grid(row=0, column=1, sticky='ew')
        ttk.Button(buttons, text='Done (Test Environment reviewed)', command=reviewed).grid(row=1, column=1, sticky='ew')
        buttons.columnconfigure(0, weight=1)
        buttons.columnconfigure(1, weight=1)
        # Keep the session fixed while environment bindings are alive.
        dialog.transient(self.window)
        dialog.grab_set()
        dialog.bind('<Escape>', lambda event: dialog.destroy())
        dialog.protocol('WM_DELETE_WINDOW', lambda: (self.save(), dialog.destroy()))
        first = next(w for w in frame.winfo_children() if isinstance(w, ttk.Entry))
        first.focus_set()

    def export(self):
        if not self.save(): return
        folder = self.root / 'docs/manual-results'
        filename = filedialog.asksaveasfilename(parent=self.window, initialdir=folder,
            initialfile=f'{datetime.now():%Y-%m-%d}-{self.session["session_id"][:8]}.md',
            defaultextension='.md', filetypes=[('Markdown report', '*.md')])
        if filename:
            try:
                export_session(filename, self.session, self.root)
                messagebox.showinfo('Exported', f'Review for secrets and real evidence before committing:\n{filename}', parent=self.window)
            except (OSError, ValueError) as error: messagebox.showerror('Export failed', str(error), parent=self.window)

    def copy_report(self):
        self.flush_notes()
        try:
            report = failure_report(self.session, self.current)
            self.window.clipboard_clear()
            self.window.clipboard_append(report)
            self.window.update_idletasks()
            self.save_label.set('Failure/Blocked/Partial report copied. Keep this app open while pasting on Linux.')
        except (ValueError, tk.TclError) as error: messagebox.showinfo('Copy report', str(error), parent=self.window)

    def help(self):
        messagebox.showinfo('Keyboard and workflow',
            'Ctrl+N New | Ctrl+O Open | Ctrl+S Save | Ctrl+F Search\n'
            'Alt+Left/Right Previous/Next | Alt+Down Next Not Run (includes Partial)\n'
            'Tab / Shift+Tab move focus, arrows select tests/scenarios, Space activates buttons.\n\n'
            'Select a scenario, type actual/evidence, choose a status, then advance. Each scenario is required '
            'unless explicitly N/A. Test-level notes are separate. Autosave occurs after 350 ms and on navigation/close. '
            'Filters affect progress; exports retain every recorded result. Startup uses a machine-local resume pointer; copied checkout pointers are ignored.\n\n'
            'Historical evidence never sets a current Pass. Open older sessions with their saved definitions; '
            'start New for updated definitions. For schema/export/smoke instructions see docs/manual-testing/README.md.\n\n'
            + WARNING, parent=self.window)

    def close(self):
        if self.safe_leave(): self.window.destroy()


def launch(root, catalog, session_path=None):
    try:
        window = tk.Tk()
    except tk.TclError as error:
        raise ValueError('Cannot initialize Tk/display. Run python3 -m tkinter (Windows: py -3 -m tkinter); '
                         'see docs/manual-testing/README.md. Headless --validate/--export need no display.') from error
    Runner(window, root, catalog, session_path)
    window.mainloop()

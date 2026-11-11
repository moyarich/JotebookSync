import "./Monaco.css";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Copy, FileCode2, LockKeyhole, Save } from "lucide-react";
import { CopyButton } from "../CopyButton/CopyButton.js";
import { reconcileFileDrafts } from "./drafts.js";

export interface MonacoFile {
  name: string;
  value: string;
  language?: string;
  path?: string;
  readOnly?: boolean;
}

export interface MonacoEditorRenderProps {
  file: MonacoFile;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}

export interface MonacoProps {
  files: readonly MonacoFile[];
  activeFile?: string;
  defaultActiveFile?: string;
  onActiveFileChange?: (name: string, file: MonacoFile) => void;
  onFileChange?: (name: string, value: string, file: MonacoFile) => void;
  readOnly?: boolean;
  onSave?: (name: string, value: string, file: MonacoFile) => void;
  renderEditor: (props: MonacoEditorRenderProps) => ReactNode;
  showFileTabs?: boolean;
  showCopyButton?: boolean;
  className?: string;
}

export function Monaco({
  files,
  activeFile: controlledActiveFile,
  defaultActiveFile,
  onActiveFileChange,
  onFileChange,
  renderEditor,
  readOnly = false,
  onSave,
  showFileTabs = true,
  showCopyButton = true,
  className,
}: MonacoProps) {
  const id = useId();
  if (new Set(files.map((file) => file.name)).size !== files.length)
    throw new Error("Monaco file names must be unique.");
  const [uncontrolledActiveFile, setUncontrolledActiveFile] = useState(
    defaultActiveFile ?? files[0]?.name ?? "",
  );
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(files.map((file) => [file.name, file.value])),
  );

  const previousValues = useRef(
    new Map(files.map((file) => [file.name, file.value])),
  );
  useEffect(() => {
    const previous = previousValues.current;
    setDrafts((current) => reconcileFileDrafts(current, previous, files));
    previousValues.current = new Map(
      files.map((file) => [file.name, file.value]),
    );
  }, [files]);

  const selectedName = controlledActiveFile ?? uncontrolledActiveFile;
  const selectedFile = useMemo(
    () => files.find((file) => file.name === selectedName) ?? files[0],
    [files, selectedName],
  );

  if (!selectedFile) return null;

  function selectFile(file: MonacoFile) {
    if (controlledActiveFile === undefined)
      setUncontrolledActiveFile(file.name);
    onActiveFileChange?.(file.name, file);
  }

  const locked = readOnly || selectedFile.readOnly === true;
  function saveFile() {
    if (!locked)
      onSave?.(
        selectedFile.name,
        drafts[selectedFile.name] ?? selectedFile.value,
        selectedFile,
      );
  }
  function changeFile(value: string) {
    if (locked) return;
    setDrafts((current) => ({ ...current, [selectedFile.name]: value }));
    onFileChange?.(selectedFile.name, value, selectedFile);
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? files.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % files.length
            : event.key === "ArrowLeft"
              ? (index - 1 + files.length) % files.length
              : -1;
    if (next < 0) return;
    event.preventDefault();
    selectFile(files[next]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  const hasTabs = showFileTabs && files.length > 1;
  const selectedIndex = files.indexOf(selectedFile);
  return (
    <div
      data-moyaforge-monaco=""
      className={className}
      data-readonly={locked || undefined}
      onKeyDownCapture={(event) => {
        if (
          onSave &&
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          event.stopPropagation();
          saveFile();
        }
      }}
    >
      {(hasTabs || showCopyButton || onSave) && (
        <div data-moyaforge-monaco-toolbar="">
          {hasTabs ? (
            <div
              data-moyaforge-monaco-tabs=""
              role="tablist"
              aria-label="Files"
            >
              {files.map((file, index) => (
                <button
                  key={file.name}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${index}`}
                  aria-controls={`${id}-panel`}
                  aria-selected={file.name === selectedFile.name}
                  tabIndex={file.name === selectedFile.name ? 0 : -1}
                  onKeyDown={(event) => keyDown(event, index)}
                  onClick={() => selectFile(file)}
                >
                  <FileCode2 size={15} aria-hidden="true" />
                  <span>{file.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <span data-moyaforge-monaco-filename="">
              <FileCode2 size={15} aria-hidden="true" />
              {selectedFile.name}
            </span>
          )}
          <div data-moyaforge-monaco-actions="">
            {locked && (
              <span data-moyaforge-monaco-readonly="">
                <LockKeyhole size={13} aria-hidden="true" />
                <span>Read only</span>
              </span>
            )}
            {onSave && (
              <button
                type="button"
                data-moyaforge-monaco-save=""
                disabled={locked}
                aria-label={`Save ${selectedFile.name}`}
                onClick={saveFile}
              >
                <Save size={14} aria-hidden="true" />
                <span>Save</span>
              </button>
            )}
            {showCopyButton && (
              <CopyButton
                data-moyaforge-monaco-copy=""
                aria-label={`Copy ${selectedFile.name}`}
                icon={<Copy size={14} aria-hidden="true" />}
                getValue={() => drafts[selectedFile.name] ?? selectedFile.value}
              >
                Copy
              </CopyButton>
            )}
          </div>
        </div>
      )}
      <div
        data-moyaforge-monaco-editor=""
        id={`${id}-panel`}
        role={hasTabs ? "tabpanel" : undefined}
        aria-labelledby={hasTabs ? `${id}-tab-${selectedIndex}` : undefined}
      >
        {renderEditor({
          file: selectedFile,
          readOnly: locked,
          value: drafts[selectedFile.name] ?? selectedFile.value,
          onChange: changeFile,
        })}
      </div>
    </div>
  );
}

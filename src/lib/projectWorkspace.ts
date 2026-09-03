import type { ProjectGenerationResult } from "../types/codeGeneration";
import type { ProjectWorkspace, WorkspaceExportResult } from "../types/workspace";

function safeName(value: string): string {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized.slice(0, 64) || "promptflow-project";
}

function isSafeWorkspacePath(path: string): boolean {
    return Boolean(
        path
        && !path.startsWith("/")
        && !path.includes("\\\\")
        && !/^[A-Za-z]:/.test(path)
        && !path.split("/").some((part) => part === ".."),
    );
}

function utf8(value: string): Uint8Array {
    return new TextEncoder().encode(value);
}

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(view: DataView, offset: number, value: number): void {
    view.setUint16(offset, value, true);
}

function writeU32(view: DataView, offset: number, value: number): void {
    view.setUint32(offset, value >>> 0, true);
}

function buildZip(files: Array<{ path: string; content: string }>): Uint8Array {
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
        if (!isSafeWorkspacePath(file.path)) {
            throw new Error(`Unsafe workspace path rejected: ${file.path}`);
        }
        const name = utf8(file.path);
        const data = utf8(file.content);
        const crc = crc32(data);
        const local = new Uint8Array(30 + name.length + data.length);
        const localView = new DataView(local.buffer);
        writeU32(localView, 0, 0x04034b50);
        writeU16(localView, 4, 20);
        writeU16(localView, 6, 0);
        writeU16(localView, 8, 0);
        writeU16(localView, 10, 0);
        writeU16(localView, 12, 0);
        writeU32(localView, 14, crc);
        writeU32(localView, 18, data.length);
        writeU32(localView, 22, data.length);
        writeU16(localView, 26, name.length);
        writeU16(localView, 28, 0);
        local.set(name, 30);
        local.set(data, 30 + name.length);
        localParts.push(local);

        const central = new Uint8Array(46 + name.length);
        const centralView = new DataView(central.buffer);
        writeU32(centralView, 0, 0x02014b50);
        writeU16(centralView, 4, 20);
        writeU16(centralView, 6, 20);
        writeU16(centralView, 8, 0);
        writeU16(centralView, 10, 0);
        writeU16(centralView, 12, 0);
        writeU16(centralView, 14, 0);
        writeU32(centralView, 16, crc);
        writeU32(centralView, 20, data.length);
        writeU32(centralView, 24, data.length);
        writeU16(centralView, 28, name.length);
        writeU16(centralView, 30, 0);
        writeU16(centralView, 32, 0);
        writeU16(centralView, 34, 0);
        writeU16(centralView, 36, 0);
        writeU32(centralView, 38, 0);
        writeU32(centralView, 42, offset);
        central.set(name, 46);
        centralParts.push(central);
        offset += local.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    writeU32(endView, 0, 0x06054b50);
    writeU16(endView, 8, files.length);
    writeU16(endView, 10, files.length);
    writeU32(endView, 12, centralSize);
    writeU32(endView, 16, offset);
    const output = new Uint8Array(offset + centralSize + end.length);
    let cursor = 0;
    for (const part of localParts) {
        output.set(part, cursor);
        cursor += part.length;
    }
    for (const part of centralParts) {
        output.set(part, cursor);
        cursor += part.length;
    }
    output.set(end, cursor);
    return output;
}

export function createProjectWorkspace(project: ProjectGenerationResult): ProjectWorkspace {
    return {
        projectName: project.projectName,
        createdAt: Date.now(),
        fingerprint: project.architectureFingerprint,
        files: project.artifacts.map((artifact) => ({
            path: artifact.path,
            kind: artifact.kind,
            language: artifact.language,
            content: artifact.content,
        })),
        execution: project.execution,
    };
}

export function exportProjectWorkspace(project: ProjectGenerationResult): WorkspaceExportResult {
    const workspace = createProjectWorkspace(project);
    const manifest = JSON.stringify({
        projectName: workspace.projectName,
        fingerprint: workspace.fingerprint,
        createdAt: workspace.createdAt,
        fileCount: workspace.files.length,
        execution: workspace.execution,
    }, null, 2) + "\n";
    const files = [
        ...workspace.files.map((file) => ({ path: file.path, content: file.content })),
        { path: "promptflow/workspace.json", content: manifest },
    ];
    const bytes = buildZip(files);
    const blob = new Blob([bytes] as BlobPart[], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName(project.projectName)}-promptflow.zip`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return {
        fileName: anchor.download,
        fileCount: files.length,
        byteCount: bytes.byteLength,
    };
}

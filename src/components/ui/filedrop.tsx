import React, { useCallback, useState, forwardRef } from "react";
import { Card, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { FileIcon, UploadIcon, XIcon } from "lucide-react";
import cn from "clsx";

export interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFiles?: number;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export const FileDropZone = forwardRef<HTMLDivElement, FileDropZoneProps>(
  (
    {
      onFilesSelected,
      acceptedFileTypes = [],
      maxFiles = 1,
      className,
    }: FileDropZoneProps,
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);

    const acceptedFileTypesString = acceptedFileTypes.join(",");
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback(
      (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        const newFiles = Array.from(selectedFiles);
        const validFiles = acceptedFileTypes.length
          ? newFiles.filter((file) =>
              acceptedFileTypes.some(
                (type) =>
                  file.type.includes(type.replace("*", "")) ||
                  file.name.endsWith(type.replace("*", ""))
              )
            )
          : newFiles;

        const filesToAdd = validFiles.slice(0, maxFiles);
        onFilesSelected(filesToAdd);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      [maxFiles, acceptedFileTypes, onFilesSelected]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
      setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
      },
      [handleFileChange]
    );

    const openFileDialog = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    return (
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        ref={ref}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
          accept={acceptedFileTypesString}
          multiple={maxFiles > 1}
        />

        <div className="flex flex-col items-center justify-center gap-1 text-center">
          <UploadIcon className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">
            Drag & drop {maxFiles > 1 ? "files" : "a file"} here, or click to
            select
          </p>
          <p className="text-xs text-muted-foreground">
            {acceptedFileTypes.length > 0
              ? `Accepts: ${acceptedFileTypes.join(", ")}`
              : "All file types supported"}
            {maxFiles > 1 ? ` (max ${maxFiles} files)` : ""}
          </p>

          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={(e) => {
              e.stopPropagation();
              openFileDialog();
            }}
          >
            Select file{maxFiles > 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    );
  }
);

FileDropZone.displayName = "FileDropZone";
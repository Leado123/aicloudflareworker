// Universal Mode Component - Standardized wrapper for all mode components
import { BaseEntity, ModeComponentProps } from '@/util/modeDefinitions';
import React from 'react';
import { useMode } from '../ModeProvider/component';



// Props for the UniversalModeComponent
interface UniversalModeComponentProps<T extends BaseEntity> {
    mode?: 'chat' | 'craftingTable' | 'write';
    renderHeader?: (props: ModeComponentProps<T>) => React.ReactNode;
    renderFooter?: (props: ModeComponentProps<T>) => React.ReactNode;
    renderSidebar?: (props: ModeComponentProps<T>) => React.ReactNode;
    className?: string;
    containerClassName?: string;
}

// Universal Mode Component that provides consistent structure
export function UniversalModeComponent<T extends BaseEntity>({
    renderHeader,
    renderFooter,
    renderSidebar,
    className = "",
    containerClassName = "w-full h-full flex flex-col"
}: UniversalModeComponentProps<T>) {
    const { mode, props } = useMode<T>();
    const ModeComponent = mode.component;

    return (
        <div className={containerClassName}>
            {/* Optional Header */}
            {renderHeader && (
                <div className="flex-shrink-0 border-b">
                    {renderHeader(props)}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Optional Sidebar */}
                {renderSidebar && (
                    <div className="flex-shrink-0 border-r">
                        {renderSidebar(props)}
                    </div>
                )}

                {/* Main Content */}
                <div className={`flex-1 ${className}`}>
                    <ModeComponent {...props} />
                </div>
            </div>

            {/* Optional Footer */}
            {renderFooter && (
                <div className="flex-shrink-0 border-t">
                    {renderFooter(props)}
                </div>
            )}
        </div>
    );
}

// Pre-built header components
export function EntityListHeader<T extends BaseEntity>({ entities, createEntity, mode }: ModeComponentProps<T> & { mode: any }) {
    return (
        <div className="p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{mode.displayName}</h2>
            <button
                onClick={() => createEntity()}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
                New {mode.displayName.slice(3)} {/* Remove "AI " prefix */}
            </button>
        </div>
    );
}

// Pre-built sidebar components
export function EntityListSidebar<T extends BaseEntity>({ 
    entities, 
    currentEntity, 
    setCurrentEntity, 
    deleteEntity,
    createEntity 
}: ModeComponentProps<T>) {
    return (
        <div className="w-64 bg-gray-50 flex flex-col">
            <div className="p-4 border-b">
                <button
                    onClick={() => createEntity()}
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Create New
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {entities.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">
                        No items yet
                    </div>
                ) : (
                    <div className="divide-y">
                        {entities.map((entity) => (
                            <div
                                key={entity.id}
                                className={`p-3 cursor-pointer hover:bg-gray-100 transition-colors ${
                                    currentEntity?.id === entity.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                                }`}
                                onClick={() => setCurrentEntity(entity.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium truncate">
                                            {entity.title}
                                        </h3>
                                        {entity.updatedAt && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {entity.updatedAt.toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Are you sure you want to delete this item?')) {
                                                deleteEntity(entity.id);
                                            }
                                        }}
                                        className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Status bar footer component
export function StatusFooter<T extends BaseEntity>({ entities, currentEntity, isEmpty }: ModeComponentProps<T>) {
    return (
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
            <div>
                {entities.length} item{entities.length !== 1 ? 's' : ''} total
            </div>
            {currentEntity && (
                <div className="flex items-center space-x-4">
                    <span>ID: {currentEntity.id.slice(0, 8)}...</span>
                    {currentEntity.updatedAt && (
                        <span>Modified: {currentEntity.updatedAt.toLocaleString()}</span>
                    )}
                    <span className={isEmpty ? 'text-orange-600' : 'text-green-600'}>
                        {isEmpty ? 'Empty' : 'Has Content'}
                    </span>
                </div>
            )}
        </div>
    );
}

// Utility component for empty states
export function EmptyState({ 
    icon, 
    title, 
    description, 
    actionLabel, 
    onAction 
}: {
    icon?: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            {icon && <div className="mb-4 text-gray-400">{icon}</div>}
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 mb-6 max-w-md">{description}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

import React from 'react';

interface PatientBadgesProps {
    isFirstTime?: number;
    isTroublesome?: number;
    isContagious?: number;
    specialNote?: string;
}

const PatientBadges: React.FC<PatientBadgesProps> = ({
    isFirstTime = 0,
    isTroublesome = 0,
    isContagious = 0,
    specialNote
}) => {
    return (
        <div className="flex flex-wrap gap-2 my-1">
            {isFirstTime === 1 && (
                <span className="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800">
                    初診
                </span>
            )}

            {isTroublesome === 1 && (
                <span className="px-2 py-1 text-xs font-medium rounded-md bg-orange-100 text-orange-800">
                    ⚠️ 特殊情況
                </span>
            )}

            {isContagious === 1 && (
                <span className="px-2 py-1 text-xs font-medium rounded-md bg-red-100 text-red-800">
                    ⚠️ 傳染病風險
                </span>
            )}

            {specialNote && (
                <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-100 text-yellow-800 max-w-xs truncate" title={specialNote}>
                    📝 {specialNote}
                </span>
            )}
        </div>
    );
};

export default PatientBadges;

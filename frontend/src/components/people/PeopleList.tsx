import React from 'react'
import { retroBadge, retroTableHeader } from '../retroTheme'
import { formatNumberFa } from '../../utils/num'
import * as PeopleModule from '../../modules/PeopleModule'

interface PeopleListProps {
  people: PeopleModule.PersonWithBalance[]
  onSelectPerson: (person: PeopleModule.PersonWithBalance) => void
  sortField: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: 'name' | 'debit' | 'credit' | 'balance' | 'created_at') => void
}

export default function PeopleList({ people, onSelectPerson, sortField, sortOrder, onSort }: PeopleListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
        <thead>
          <tr>
            <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => onSort('name')}>
              نام {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className={retroTableHeader}>نوع</th>
            <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => onSort('debit')}>
              بدهکار {sortField === 'debit' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => onSort('credit')}>
              بستانکار {sortField === 'credit' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => onSort('balance')}>
              مانده {sortField === 'balance' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className={retroTableHeader}>کد</th>
            <th className={retroTableHeader}>موبایل</th>
            <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => onSort('created_at')}>
              تاریخ ثبت {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map(person => (
            <tr 
              key={person.id} 
              className="border-b border-[#d9cfb6] hover:bg-[#f6f1df] cursor-pointer"
              onClick={() => onSelectPerson(person)}
            >
              <td className="px-3 py-2 font-semibold">
                {person.name}
              </td>
              <td className="px-3 py-2 text-xs">
                {person.kind === 'customer' ? 'مشتری' : person.kind === 'supplier' ? 'تأمین‌کننده' : 'سایر'}
              </td>
              <td className="px-3 py-2 text-left font-mono">
                {person.debit > 0 ? (
                  <span className="text-red-700">{formatNumberFa(person.debit)}</span>
                ) : (
                  <span className="text-[#7a6b4f]">-</span>
                )}
              </td>
              <td className="px-3 py-2 text-left font-mono">
                {person.credit > 0 ? (
                  <span className="text-green-700">{formatNumberFa(person.credit)}</span>
                ) : (
                  <span className="text-[#7a6b4f]">-</span>
                )}
              </td>
              <td className="px-3 py-2 text-left font-mono font-semibold">
                {person.balance !== 0 ? (
                  <span className={person.balance > 0 ? 'text-red-700' : 'text-green-700'}>
                    {formatNumberFa(Math.abs(person.balance))}
                    {person.balance > 0 ? ' (بده)' : ' (بستان)'}
                  </span>
                ) : (
                  <span className="text-[#7a6b4f]">تسویه</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs">{person.code ?? '-'}</td>
              <td className="px-3 py-2 text-xs">{person.mobile ?? '-'}</td>
              <td className="px-3 py-2 text-xs text-[#7a6b4f]">
                {new Date(person.created_at).toLocaleDateString('fa-IR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react'




import grapesjs from 'grapesjs'




import 'grapesjs/dist/css/grapes.min.css'




import {




  retroButton,




  retroHeading,




  retroInput,




  retroMuted,




  retroPanel,




  retroPanelPadded,




} from '../components/retroTheme'




import {




  deletePageBuilderTemplate,




  listPageBuilderTemplates,




  savePageBuilderTemplate,




  PageBuilderTemplate,




} from '../services/pageBuilder'









const DEFAULT_HTML = `<section style="padding:32px;background:#fdfdf7;">









  <h1 style="font-size:28px;color:#1f2e3b;">صفحه ساز</h1>









  <p style="color:#4a4a4a;">با drag-and-drop صفحه را به راحتی طراحی کنید.</p>









</section>`




const DEFAULT_CSS = `body { font-family: var(--app-font, 'Yekan', -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif); background: #fff; } section { border-radius: 12px; }`








export default function PageBuilderModule() {




  const canvasRef = useRef<HTMLDivElement | null>(null)




  const editorRef = useRef<any>(null)




  const [templates, setTemplates] = useState<PageBuilderTemplate[]>([])




  const [selectedTemplate, setSelectedTemplate] = useState<PageBuilderTemplate | null>(null)




  const [name, setName] = useState('صفحه جدید')




  const [status, setStatus] = useState<string | null>(null)




  const [loadingTemplates, setLoadingTemplates] = useState(false)




  const [saving, setSaving] = useState(false)









  const loadTemplates = useCallback(async () => {




    setLoadingTemplates(true)




    try {




      const list = await listPageBuilderTemplates()




      setTemplates(list)




      return list




    } catch (err: any) {




      setStatus(err?.message ?? 'خطا در بارگذاری قالب‌ها')




      return []




    } finally {




      setLoadingTemplates(false)




    }




  }, [])









  useEffect(() => {




    loadTemplates()




  }, [loadTemplates])









  useEffect(() => {




    if (!canvasRef.current || editorRef.current) return




    const editor = grapesjs.init({




      container: canvasRef.current,




      height: '65vh',




      fromElement: false,




      storageManager: { autoload: false },




      blockManager: { appendTo: '#gjs-blocks', blocks: [] },




      canvas: {




        styles: [],




        scripts: [],




      },




    })




        editor.BlockManager.add('section-block', {




          label: 'بخش ساده',




          category: 'بخش‌ها',




          attributes: { class: 'gjs-block-section' },




          content: `<section style="padding:24px;background:#f0f4ff;border-radius:16px;">




            <h2 style="margin:0;color:#0e2f3c;">سربرگ با پس‌زمینه</h2>




            <p style="margin-top:8px;color:#4a4a4a;">متن پاراگراف برای توضیح بخش.</p>




          </section>`,




        })




        editor.BlockManager.add('text-block', {




          label: 'متن ساده',




          category: 'متن',




          content: '<p style="margin:0;font-size:16px;">متن جدید</p>',




        })




        editor.BlockManager.add('cta-block', {




          label: 'دکمه فراخوان',




          category: 'اصلی',




          content: '<button style="padding:12px 24px;background:#154b5f;color:#fff;border:none;border-radius:8px;">کلیک کنید</button>',




        })




    editor.setComponents(DEFAULT_HTML)




    editor.setStyle(DEFAULT_CSS)




    editorRef.current = editor




    return () => editor.destroy()




  }, [])









  const handleSelectTemplate = (template: PageBuilderTemplate) => {




    setSelectedTemplate(template)




    setName(template.name)




    if (!editorRef.current) return




    editorRef.current.setComponents(template.html || DEFAULT_HTML)




    editorRef.current.setStyle(template.css || DEFAULT_CSS)




  }









  const handleNewTemplate = () => {




    setSelectedTemplate(null)




    setName(    setName('صفحه جدید'))




    if (!editorRef.current) return




    editorRef.current.setComponents(DEFAULT_HTML)




    editorRef.current.setStyle(DEFAULT_CSS)




  }









  const handleSave = async () => {




    if (!editorRef.current) return




    setSaving(true)




    try {




      const html = editorRef.current.getHtml()




      const css = editorRef.current.getCss()




      const saved = await savePageBuilderTemplate({




        id: selectedTemplate?.id,




        name: name ||     setName('صفحه جدید'),




        html,




        css,




      })




      await loadTemplates()




      setSelectedTemplate(saved)




      setName(saved.name)




      setStatus('قالب با موفقیت ذخیره شد')




        } catch (err: any) {




          setStatus(err?.message ?? 'خطا در ذخیره قالب')




        } finally {




      setSaving(false)




    }




  }









  const handleDelete = async (template: PageBuilderTemplate) => {




    const confirmed = window.confirm('آیا از حذف این قالب اطمینان دارید؟')




    if (!confirmed) return




    setSaving(true)




    try {




      await deletePageBuilderTemplate(template.id)




      await loadTemplates()




      if (selectedTemplate?.id === template.id) {




        handleNewTemplate()




      }




      setStatus('قالب حذف شد')




        } catch (err: any) {




          setStatus(err?.message ?? 'خطا در حذف قالب')




        } finally {




      setSaving(false)




    }




  }














  return (




    <div className="space-y-4">




      <section className={`${retroPanelPadded} space-y-3`}>




        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">




          <div>




                        <p className={retroHeading}>صفحه ساز</p>




                        <p className={`text-xs ${retroMuted}`}>با drag-and-drop صفحه را به راحتی طراحی کنید.</p>




          </div>




          <div className="flex flex-wrap gap-2">




                        <button className={`${retroButton} !bg-[#1f2e3b]`} type="button" onClick={handleNewTemplate}>




                          قالب جدید




                        </button>




                        <button className={retroButton} type="button" onClick={handleSave} disabled={saving}>




                          {saving ? 'در حال ذخیره...' : 'ذخیره قالب'}




                        </button>




          </div>




        </header>









        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">




          <div className="space-y-3">




            <div className={`${retroPanel} p-3 space-y-2`}>




                            <label className={retroHeading}>نام قالب</label>




                            <input




                              value={name}




                              onChange={e => setName(e.target.value)}




                              className={`${retroInput} w-full`}




                              placeholder="نامی برای صفحه ساز"




                            />




            </div>









                        <div className={`${retroPanel} p-3 space-y-2`}>









                          <p className={retroHeading}>قالب‌های ذخیره شده</p>









                          {loadingTemplates ? (









                            <p className={`text-xs ${retroMuted}`}>در حال بارگذاری قالب‌ها...</p>









                          ) : templates.length === 0 ? (









                            <p className={`text-xs ${retroMuted}`}>هیچ قالبی ذخیره نشده است.</p>









                          ) : (




                <div className="space-y-2">




                  {templates.map(template => (




                    <div




                      key={template.id}




                      className={`flex flex-col gap-2 rounded-sm border px-3 py-2 ${




                        template.id === selectedTemplate?.id




                          ? 'border-[#1f2e3b] bg-[#fdfaf2]'




                          : 'border-[#bfb69f] bg-white'




                      }`}




                      onClick={() => handleSelectTemplate(template)}




                    >




                      <div className="flex items-start justify-between gap-2">




                        <div className="text-right">




                          <p className="text-sm font-semibold text-[#1f2e3b]">{template.name}</p>




                          <p className="text-[11px] text-[#7a6b4f]">




                            {new Date(template.updated_at).toLocaleString('fa-IR', {




                              dateStyle: 'short',




                              timeStyle: 'short',




                            })}




                          </p>




                        </div>




                        <button




                          type="button"




                          className="text-[11px] text-[#c35c5c]"




                          onClick={e => {




                            e.stopPropagation()




                            handleDelete(template)




                          }}




                        >




                          ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ°ط·آ·ط¢آ¸ط·آ¸ط¢آ¾




                        </button>




                      </div>




                      {template.metadata?.updated_by && (




                        <p className="text-[11px] text-[#7a6b4f]">




                          ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ· {String(template.metadata.updated_by)}




                        </p>




                      )}




                    </div>




                  ))}




                </div>




              )}




            </div>




            {status && <p className={`text-sm font-semibold text-[#154b5f]`}>{status}</p>}




          </div>









          <div className="space-y-3">




            <div className={`${retroPanel} p-3 space-y-3`}>




              <p className={retroHeading}>ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§</p>




              <div




                id="gjs-blocks"




                className="grid grid-cols-3 gap-2 rounded-sm border border-dashed border-[#bfb69f] bg-[#faf4de] p-2 text-[11px] text-[#2e2720]"




              ></div>




            </div>




            <div className={`${retroPanel} p-0`}>




              <div




                ref={canvasRef}




                className="min-h-[60vh] rounded-b-sm rounded-t-sm border border-[#bfb69f] bg-white"




              />




            </div>




          </div>




        </div>




      </section>




    </div>




  )




}




